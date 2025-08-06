import React from 'react';

export default function ActivityCard({ activity, onLink }) {
  const { title, subtitle, timing, externalLinks = [] } = activity;
  return (
    <div style={{border:'1px solid #e0e0e0',borderRadius:8,padding:'1rem',background:'#fff',boxShadow:'0 2px 4px rgba(0,0,0,0.06)'}}>
      <h4 style={{margin:0}}>{title}</h4>
      <p style={{margin:'4px 0',color:'#555'}}>{subtitle}</p>
      {timing && <p style={{fontSize:'0.9rem',color:'#007bff',margin:'4px 0'}}>{timing}</p>}
      {externalLinks.map((l,i)=>(
        <button key={i} onClick={()=>onLink(l.url)} style={{marginTop:4,fontSize:'0.85rem'}}>🔗 {l.label}</button>
      ))}
    </div>
  );
} 