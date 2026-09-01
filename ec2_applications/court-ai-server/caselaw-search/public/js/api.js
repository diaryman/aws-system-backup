const API = {
  apiKey: localStorage.getItem('slegaltools_api_key') || '',
  
  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    if (this.apiKey) {
      localStorage.setItem('slegaltools_api_key', this.apiKey);
    } else {
      localStorage.removeItem('slegaltools_api_key');
    }
  },
  
  getApiKey() {
    return this.apiKey;
  },

  async request(path, body) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers,
      body: JSON.stringify({ path, body })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.details || 'API Request failed');
    }
    return data;
  },
  
  // Deka Search APIs
  async aiDekaSearch(question, top_k = 10) {
    return this.request('/api/search/ai', { question, top_k });
  },
  
  async searchDekaText(query, options = {}) {
    return this.request('/api/search/text', {
      query,
      top_k: options.top_k || 10,
      law_code: options.law_code || undefined,
      sections: options.sections || undefined,
      year_from: options.year_from ? parseInt(options.year_from) : undefined,
      year_to: options.year_to ? parseInt(options.year_to) : undefined,
      document_type: options.document_type || undefined
    });
  },
  
  async searchByLaw(law_code, sections = null, provision_type = null, top_k = 10) {
    return this.request('/api/search/law', { 
      law_code, 
      sections: sections ? (Array.isArray(sections) ? sections : [sections]) : undefined, 
      provision_type: provision_type || undefined, 
      top_k 
    });
  },
  
  async getDekaCase(deka_no, options = {}) {
    return this.request('/api/tool/get_deka_case', {
      deka_no,
      include_law_refs: options.include_law_refs !== false,
      include_long_text: options.include_long_text !== false,
      max_long_text_chars: options.max_long_text_chars || 30000
    });
  },
  
  async makeCitationPack(options = {}) {
    return this.request('/api/tool/make_citation_pack', {
      deka_nos: options.deka_nos || undefined,
      case_ids: options.case_ids || undefined,
      issue: options.issue || undefined,
      facts: options.facts || undefined,
      include_long_text: options.include_long_text !== false,
      max_long_text_chars_per_case: options.max_long_text_chars_per_case || 20000,
      top_k_if_search_needed: options.top_k_if_search_needed || 5
    });
  },
  
  // Law/Statute APIs
  async getLawStats() {
    return this.request('/api/tool/law_v2_stats', {});
  },
  
  async searchLaws(query, options = {}) {
    return this.request('/api/tool/search_laws_v2', {
      query: query || undefined,
      topic_code: options.topic_code || undefined,
      law_type_code: options.law_type_code || undefined,
      fetch_status: options.fetch_status || 'ok',
      has_text: options.has_text,
      law_scope: options.law_scope || undefined,
      lifecycle_status: options.lifecycle_status || 'current_or_future',
      top_k: options.top_k || 10
    });
  },
  
  async searchLawHistory(query, options = {}) {
    return this.request('/api/tool/search_law_history_v2', {
      query: query || undefined,
      law_code: options.law_code || undefined,
      law_scope: options.law_scope || undefined,
      lifecycle_status: options.lifecycle_status || 'all',
      top_k: options.top_k || 10
    });
  },
  
  async searchLawSections(query, options = {}) {
    return this.request('/api/tool/search_law_sections_v2', {
      query,
      law_code: options.law_code || undefined,
      doc_key: options.doc_key || undefined,
      topic_code: options.topic_code || undefined,
      section_no: options.section_no || undefined,
      law_scope: options.law_scope || undefined,
      lifecycle_status: options.lifecycle_status || 'current_or_future',
      top_k: options.top_k || 10,
      text_chars: options.text_chars || 800
    });
  },
  
  async getLawSection(options = {}) {
    return this.request('/api/tool/get_law_section_v2', {
      section_key: options.section_key || undefined,
      doc_key: options.doc_key || undefined,
      law_code: options.law_code || undefined,
      section_no: options.section_no || undefined,
      include_html: options.include_html === true,
      max_text_chars: options.max_text_chars || 30000
    });
  },
  
  // AWS Bedrock APIs
  async getBedrockStatus() {
    const response = await fetch('/api/bedrock/status');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to check AWS Bedrock status');
    }
    return data;
  },

  async buildBedrockCitation(dekaCases, issue, facts, modelId) {
    const response = await fetch('/api/bedrock/citation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dekaCases, issue, facts, modelId })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate Citation Pack');
    }
    return data;
  },

  // Streaming helper using fetch reader API
  async chatBedrockStream(messages, options = {}, onChunk, onDone, onError) {
    try {
      const response = await fetch('/api/bedrock/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          system: options.system,
          modelId: options.modelId,
          temperature: options.temperature || 0.5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || 'Chat request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last line if it's incomplete
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const dataStr = trimmed.substring(6); // remove 'data: '
          
          if (dataStr === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              onChunk(parsed.text);
            }
          } catch (e) {
            console.error('Error parsing SSE line:', line, e);
            if (e.message && e.message !== 'Unexpected token' && !e.message.startsWith('JSON.parse')) {
              throw e;
            }
          }
        }
      }

      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.substring(6);
          if (dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) onChunk(parsed.text);
            } catch {}
          }
        }
      }
      
      onDone();
    } catch (err) {
      onError(err);
    }
  }
};

window.API = API; // Make it available globally for simpler non-modular app.js
export default API;
