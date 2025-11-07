import { Link } from 'react-router-dom';
import '../index.css';

const BlogPublicNav = () => {
  return (
    <nav className="landing-nav" style={{
      position: 'sticky',
      top: 0,
      backgroundColor: 'white',
      zIndex: 1000,
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
      padding: '1rem 2rem'
    }}>
      <Link to="/" className="landing-logo" aria-label="Buildstate FM home">
        Buildstate FM
      </Link>
      <div className="landing-nav-links">
        <a href="/#features">Platform</a>
        <a href="/#workflow">How it works</a>
        <a href="/#roles">Solutions</a>
        <Link to="/blog">Blog</Link>
        <a href="/#faqs">FAQ</a>
      </div>
      <div className="landing-nav-cta">
        <Link to="/signin" className="landing-link">
          Sign in
        </Link>
        <Link to="/signup" className="landing-button">
          Start free trial
        </Link>
      </div>
    </nav>
  );
};

export default BlogPublicNav;
