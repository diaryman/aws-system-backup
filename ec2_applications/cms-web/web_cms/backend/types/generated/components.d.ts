import type { Schema, Struct } from '@strapi/strapi';

export interface SharedGallery extends Struct.ComponentSchema {
  collectionName: 'components_shared_galleries';
  info: {
    description: '';
    displayName: 'Gallery';
    icon: 'images';
  };
  attributes: {
    images: Schema.Attribute.Media<'images', true>;
    layout: Schema.Attribute.Enumeration<['grid', 'slider']> &
      Schema.Attribute.DefaultTo<'grid'>;
  };
}

export interface SharedHero extends Struct.ComponentSchema {
  collectionName: 'components_shared_heroes';
  info: {
    description: '';
    displayName: 'Hero';
    icon: 'layer-group';
  };
  attributes: {
    cta_link: Schema.Attribute.String;
    cta_text: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedNewsGrid extends Struct.ComponentSchema {
  collectionName: 'components_shared_news_grids';
  info: {
    description: '';
    displayName: 'News Grid';
    icon: 'grid';
  };
  attributes: {
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<4>;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    displayName: 'Rich Text';
    icon: 'align-left';
  };
  attributes: {
    body: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.gallery': SharedGallery;
      'shared.hero': SharedHero;
      'shared.news-grid': SharedNewsGrid;
      'shared.rich-text': SharedRichText;
    }
  }
}
