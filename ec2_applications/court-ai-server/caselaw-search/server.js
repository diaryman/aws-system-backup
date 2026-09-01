import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize AWS Clients
const REGION = process.env.AWS_REGION || 'us-east-1';
const stsClient = new STSClient({ region: REGION });
const bedrockClient = new BedrockRuntimeClient({ region: REGION });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Generic proxy endpoint for SLegalTools API
app.post('/api/proxy', async (req, res) => {
  const { path: apiPath, body } = req.body;
  
  if (!apiPath) {
    return res.status(400).json({ ok: false, error: 'Path is required' });
  }

  // Get API key from client header or default to server env
  let apiKey = process.env.SLEGALTOOLS_API_KEY;
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  
  if (authHeader) {
    apiKey = authHeader.replace('Bearer ', '').trim();
  }

  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'SLegalTools API Key is missing',
      details: 'Please configure it in the .env file on the server, or in the application settings page.'
    });
  }

  const targetUrl = `https://api.slegaltools.digital${apiPath}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'slegaltools-web-ui/1.0'
      },
      body: JSON.stringify(body || {})
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: response.ok, raw: text.substring(0, 1000) };
    }
    return res.status(response.status).json(data);
  } catch (error) {
    console.error(`Proxy error for path ${apiPath}:`, error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to communicate with SLegalTools API',
      details: error.message
    });
  }
});

// --- AWS Bedrock Routes ---

// Check AWS Connection Status and Identity
app.get('/api/bedrock/status', async (req, res) => {
  try {
    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);
    return res.json({
      ok: true,
      arn: response.Arn,
      account: response.Account,
      userId: response.UserId,
      region: REGION
    });
  } catch (error) {
    console.error('AWS Bedrock status verification failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to verify AWS credentials',
      details: error.message
    });
  }
});

// SSE Chat Streaming with Claude/Nova on Bedrock
app.post('/api/bedrock/chat-stream', async (req, res) => {
  const { messages, system, modelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0', temperature = 0.5 } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ ok: false, error: 'Messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    let requestBody;
    const isNova = modelId.includes('nova');

    if (isNova) {
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: [{ text: m.content }]
      }));
      
      requestBody = {
        messages: formattedMessages,
        inferenceConfig: {
          max_new_tokens: 4096,
          temperature: Number(temperature)
        }
      };

      if (system) {
        requestBody.system = [{ text: system }];
      }
    } else {
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        temperature: Number(temperature),
        messages: messages
      };

      if (system) {
        requestBody.system = system;
      }
    }

    const command = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });
    
    const response = await bedrockClient.send(command);
    
    for await (const chunk of response.body) {
      if (chunk.chunk && chunk.chunk.bytes) {
        const decoded = JSON.parse(new TextDecoder('utf-8').decode(chunk.chunk.bytes));
        
        if (isNova) {
          if (decoded.contentBlockDelta?.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: decoded.contentBlockDelta.delta.text })}\n\n`);
          } else if (decoded.messageStop) {
            res.write(`data: [DONE]\n\n`);
          }
        } else {
          if (decoded.type === 'content_block_delta' && decoded.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: decoded.delta.text })}\n\n`);
          } else if (decoded.type === 'message_stop') {
            res.write(`data: [DONE]\n\n`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Bedrock stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

// Bedrock Citation Pack Synthesizer
app.post('/api/bedrock/citation', async (req, res) => {
  const { dekaCases, issue, facts, modelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0' } = req.body;
  
  if (!dekaCases || !Array.isArray(dekaCases) || dekaCases.length === 0) {
    return res.status(400).json({ ok: false, error: 'At least one Deka case is required in workspace' });
  }

  try {
    let casesContext = '';
    dekaCases.forEach((item, index) => {
      casesContext += `--- คดีที่ ${index + 1}: ${item.title || `ฎีกาที่ ${item.deka_no}`} ---\n`;
      casesContext += `เลขฎีกา: ${item.deka_no}\n`;
      casesContext += `เนื้อหาโดยย่อ: ${item.short_text || 'ไม่มีข้อมูลเนื้อหาย่อ'}\n`;
      if (item.long_text) {
        casesContext += `เนื้อหาฉบับเต็ม: ${item.long_text}\n`;
      }
      casesContext += `มาตราที่เกี่ยวข้อง: ${item.law_refs ? item.law_refs.join(', ') : 'ไม่ระบุ'}\n\n`;
    });

    const systemPrompt = `คุณคือ AI ผู้ช่วยนักกฎหมายอัจฉริยะ ทำหน้าที่เรียบเรียงและสังเคราะห์ "ชุดข้อมูลเอกสารอ้างอิงคดีความ" (Citation Pack) จากกลุ่มคำพิพากษาศาลฎีกาที่กำหนดให้สอดคล้องกับข้อพิพาทและข้อเท็จจริงในคดีของผู้ใช้

กรุณาเขียนชุดรายงานสรุปในรูปแบบ Markdown ที่สวยงาม เป็นระเบียบ อ่านง่าย โดยมีหัวข้อดังนี้:
1. 📌 สรุปประเด็นกฎหมายและแนวคำพิพากษาฎีกา (Legal Analysis & Summary) - อธิบายประเด็นข้อพิพาทเปรียบเทียบกับกลุ่มคดีฎีกาอ้างอิง
2. 📖 รายละเอียดคำพิพากษาศาลฎีกาอ้างอิงแต่ละคดี (Detailed Case Citations) - สรุปสั้นๆ แยกรายคดี ระบุเลขฎีกา ข้อเท็จจริงในฎีกา และบรรทัดฐานคำตัดสิน
3. ⚖️ ความเห็นและข้อเสนอแนะทางกฎหมาย (Legal Counsel & Recommendations) - ให้ข้อเสนอแนะว่าควรดำเนินคดีอย่างไรต่อโดยอิงจากข้อเท็จจริงที่ให้มา

ใช้ภาษาไทยที่เป็นทางการ ถูกต้อง และกระชับ หลีกเลี่ยงน้ำท่วมทุ่ง`;

    const userPrompt = `ประเด็นข้อพิพาท (Issue):
${issue || 'ไม่ได้ระบุประเด็นเฉพาะ'}

ข้อเท็จจริงในคดี (Facts):
${facts || 'ไม่ได้ระบุรายละเอียดข้อเท็จจริง'}

คำพิพากษาศาลฎีกาอ้างอิงที่รวบรวมได้:
${casesContext}`;

    const isNova = modelId.includes('nova');
    let requestBody;

    if (isNova) {
      requestBody = {
        messages: [{ role: 'user', content: [{ text: userPrompt }] }],
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          max_new_tokens: 4096,
          temperature: 0.2
        }
      };
    } else {
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      };
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder('utf-8').decode(response.body));

    let resultText = '';
    if (isNova) {
      resultText = responseBody.output?.message?.content?.[0]?.text || '';
    } else {
      resultText = responseBody.content?.[0]?.text || '';
    }

    return res.json({
      ok: true,
      text: resultText,
      model: modelId
    });
  } catch (error) {
    console.error('Bedrock citation generation failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to generate citation pack via AWS Bedrock',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
