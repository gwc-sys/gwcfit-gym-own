import React from 'react';
import { ExternalLink, Users, Globe, Camera, BriefcaseBusiness, MessageCircle, Plus, Trash2, Video } from 'lucide-react';
import { useGymWebsiteEditor } from './GymWebsiteEditor';

const platforms = [
  ['instagram','Instagram',Camera],['facebook','Facebook',Users],['youtube','YouTube',Video],
  ['whatsapp','WhatsApp',MessageCircle],['x','X',ExternalLink],['linkedin','LinkedIn',BriefcaseBusiness],
  ['threads','Threads',MessageCircle],['tiktok','TikTok',ExternalLink],['telegram','Telegram',MessageCircle],
  ['website','Website',Globe],['other','Other',Globe],
];
function safeUrl(value) { try { const url=new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }

export default function GymSocialLinks({links=[]}) {
  const editor=useGymWebsiteEditor();
  const editing=editor?.editing;
  const items=editing ? editor.draft.social_links : links;
  const update=(index,key,value)=>editor.change('social_links',current=>current.map((link,i)=>i===index?{...link,[key]:value}:link));
  if(!editing&&!items.length)return null;
  return <div className="gym-social-section"><h3>Connect with us</h3><div className="gym-social-links">{items.map((link,index)=>{const [,name,Icon]=platforms.find(([id])=>id===link.platform)||platforms.at(-1);const url=safeUrl(link.url);return url ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className={`gym-social-link gym-social-${link.platform}`} aria-label={`${link.label||name} — opens in a new tab`}><Icon size={18}/><span>{link.label||name}</span><ExternalLink size={12}/></a>:null;})}</div>{editing ? <div className="gym-inline-social" aria-label="Edit social links"><p>Add your gym's social profiles. Use full links, such as https://instagram.com/yourgym.</p>{items.map((link,index)=><div className="gym-inline-social-row" key={index}><label>Platform<select aria-label={`Social platform ${index+1}`} value={link.platform} disabled={editor.busy} onChange={event=>update(index,'platform',event.target.value)}>{platforms.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Profile link<input type="url" aria-label={`Social link ${index+1}`} value={link.url} placeholder={link.platform==='whatsapp'?'https://wa.me/919012345678':'https://…'} maxLength={2000} disabled={editor.busy} onChange={event=>update(index,'url',event.target.value)}/></label>{link.platform==='other'?<label>Display name<input aria-label={`Social label ${index+1}`} value={link.label||''} maxLength={60} placeholder="Platform name" disabled={editor.busy} onChange={event=>update(index,'label',event.target.value||null)}/></label>:null}<button type="button" aria-label={`Remove social link ${index+1}`} disabled={editor.busy} onClick={()=>editor.change('social_links',current=>current.filter((_,i)=>i!==index))}><Trash2 size={16}/> Remove</button></div>)}<button type="button" disabled={editor.busy||items.length>=20} onClick={()=>editor.change('social_links',current=>[...current,{platform:'instagram',url:'',label:null}])}><Plus size={16}/> Add social link</button></div>:null}</div>;
}
