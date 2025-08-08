import React from 'react';

export default function ActivityCard({ activity, onLink }) {
  const { title, subtitle, timing, bookingUrl, externalLinks = [] } = activity;
  
  const handleBooking = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };
  
  return (
    <div style={{border:'1px solid #e0e0e0',borderRadius:8,padding:'1rem',background:'#fff',boxShadow:'0 2px 4px rgba(0,0,0,0.06)'}}>
      <h4 style={{margin:0}}>{title}</h4>
      <p style={{margin:'4px 0',color:'#555'}}>{subtitle}</p>
      {timing && <p style={{fontSize:'0.9rem',color:'#007bff',margin:'4px 0'}}>{timing}</p>}
      
      {/* Booking button */}
      {bookingUrl && (
        <button 
          onClick={handleBooking}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          📅 Book Now
        </button>
      )}
      
      {/* External links */}
      {externalLinks.map((l,i)=>(
        <button key={i} onClick={()=>onLink(l.url)} style={{marginTop:4,fontSize:'0.85rem',marginLeft:'4px'}}>🔗 {l.label}</button>
      ))}
    </div>
  );
} 