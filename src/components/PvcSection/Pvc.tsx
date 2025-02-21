import React from 'react';

const Pvc = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pvc</h1>
      <p style={styles.comingSoon}>Coming Soon!</p>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: '3rem',
    color: '#333',
    marginBottom: '20px',
  },
  comingSoon: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#ff6347',
    animation: 'blink 1s infinite',
  },
};

export default Pvc;
