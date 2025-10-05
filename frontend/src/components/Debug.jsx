import { useEffect } from 'react';

function Debug() {
  useEffect(() => {
    console.log('Debug component mounted - app is loading');
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', color: 'black' }}>
      <h1>Debug Mode - App is Loading</h1>
      <p>If you can see this, React is working but there might be routing issues.</p>
      <button onClick={() => window.location.href = '/signin'}>Go to Sign In</button>
      <button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</button>
    </div>
  );
}

export default Debug;