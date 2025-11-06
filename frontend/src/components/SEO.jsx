import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

/**
 * SEO Component for managing meta tags and structured data
 * Optimized for search engines and social media sharing
 */
const SEO = ({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  author,
  publishedDate,
  modifiedDate,
  article = false,
  tags = []
}) => {
  const siteName = 'AgentFM';
  const defaultDescription = 'Professional Property Management Platform';
  const defaultImage = `${window.location.origin}/logo.png`;

  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const finalUrl = url || window.location.href;

  // Generate structured data for articles
  const articleStructuredData = article ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: finalDescription,
    image: finalImage,
    datePublished: publishedDate,
    dateModified: modifiedDate || publishedDate,
    author: author ? {
      '@type': 'Person',
      name: author
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: defaultImage
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': finalUrl
    },
    keywords: tags.join(', ')
  } : {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: window.location.origin
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {author && <meta name="author" content={author} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />

      {/* Article Specific Tags */}
      {article && publishedDate && (
        <meta property="article:published_time" content={publishedDate} />
      )}
      {article && modifiedDate && (
        <meta property="article:modified_time" content={modifiedDate} />
      )}
      {article && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Canonical URL */}
      <link rel="canonical" href={finalUrl} />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(articleStructuredData)}
      </script>
    </Helmet>
  );
};

SEO.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  image: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string,
  author: PropTypes.string,
  publishedDate: PropTypes.string,
  modifiedDate: PropTypes.string,
  article: PropTypes.bool,
  tags: PropTypes.arrayOf(PropTypes.string)
};

export default SEO;
