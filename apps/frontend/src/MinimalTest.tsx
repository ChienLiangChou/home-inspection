
export default function MinimalTest() {
  console.log('MinimalTest component is rendering');
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'lightblue', 
      minHeight: '100vh',
      fontSize: '24px',
      textAlign: 'center'
    }}>
      <h1>MINIMAL TEST - IF YOU SEE THIS, REACT IS WORKING!</h1>
      <p>This is a minimal test to verify React is rendering.</p>
    </div>
  );
}




