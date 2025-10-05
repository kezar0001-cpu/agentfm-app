import NavBar from './NavBar';

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <NavBar />
      <main style={{ padding: '24px' }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;