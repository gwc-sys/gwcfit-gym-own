import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { ownerApi } from './api';

const EditingContext = createContext(null);
export const useGymWebsiteEditor = () => useContext(EditingContext);
const profileDefaults = {social_links:[],description:'',categories:[],facilities:[],gallery_photos:[],hero_photos:[],trainer_overrides:[],owner_overrides:[],hidden_trainer_ids:[],hidden_owner_ids:[]};

export function GymWebsiteEditing({ gym, onSaved, children }) {
  const [editing,setEditing] = useState(false);
  const [loginOpen,setLoginOpen] = useState(false);
  const [token,setToken] = useState('');
  const [data,setData] = useState(null);
  const [draft,setDraft] = useState(null);
  const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(0);
  const [dirty,setDirty] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const headingRef = useRef(null);
  const barRef = useRef(null);
  const [barHeight,setBarHeight] = useState(76);
  useEffect(() => {
    if (!editing || !barRef.current) return;
    const observer = new ResizeObserver(entries => setBarHeight(entries[0].target.offsetHeight));
    observer.observe(barRef.current);
    return () => observer.disconnect();
  },[editing]);
  useEffect(() => {
    if (!editing || !dirty) return;
    const warn = (event) => {event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  },[editing,dirty]);
  useEffect(() => { if (editing) headingRef.current?.focus({preventScroll:true}); },[editing]);
  const change = (key,value) => {setDirty(true);setMessage('');setDraft(current=>({...current,[key]:typeof value === 'function' ? value(current[key]) : value}));};
  const changeMany = (values) => {setDirty(true);setMessage('');setDraft(current=>({...current,...values}));};
  const activate = async (accessToken) => {
    const result = await ownerApi.gymWebsiteEditor(gym.id,accessToken);
    setData(result);setDraft({...profileDefaults,name:gym.name,address:gym.address,city:null,state:null,pincode:null,business_phone:gym.business_phone,business_email:gym.business_email,latitude:gym.latitude??null,longitude:gym.longitude??null,opening_hours:gym.opening_hours||{},...result.profile});setDirty(false);setEditing(true);setLoginOpen(false);setMessage('');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const start = async () => {
    setError('');setMessage('');
    if (!token) {setLoginOpen(true);return;}
    setBusy(true);
    try {await activate(token);} catch(error) {setError(error.message);if(error.status===401){setToken('');setLoginOpen(true);}} finally {setBusy(false);}
  };
  const signIn = async (event) => {
    event.preventDefault();setBusy(true);setError('');
    const fields = new FormData(event.currentTarget);
    try {const session=await ownerApi.login(String(fields.get('email')).trim(),String(fields.get('password')));await activate(session.tokens.access_token);setToken(session.tokens.access_token);}
    catch(error){setError(error.message);}finally{setBusy(false);}
  };
  const save = async () => {
    setBusy(true);setError('');
    try {
      if(draft.social_links.some(link=>!link.url.trim() || !/^https?:\/\//i.test(link.url))) throw new Error('Enter a full http:// or https:// URL for each social link, or remove the empty link.');
      if([...draft.gallery_photos,...draft.hero_photos].some(photo=>!photo.url.trim())) throw new Error('Add an image to each empty photo card, or remove the empty card before saving.');
      if(new TextEncoder().encode(JSON.stringify(draft)).length>950000) throw new Error('These uploads are too large to save together. Use image URLs for some photos.');
      const updated=await ownerApi.saveGymWebsite(gym.id,draft,token);
      onSaved(updated);setEditing(false);setDirty(false);setMessage('Your website changes are saved.');
    }catch(error){setError(error.message);if(error.status===401){setToken('');setLoginOpen(true);setEditing(false);}}
    finally{setBusy(false);}
  };
  const cancel = () => {setDraft(null);setEditing(false);setDirty(false);setError('');setMessage('Changes cancelled. Your published website is unchanged.');};
  const signOut = () => {ownerApi.logout(token).catch(()=>undefined);setToken('');setData(null);setDraft(null);setEditing(false);setDirty(false);setLoginOpen(false);setError('');setMessage('Signed out.');};
  const upload = async (file,apply) => {
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Choose a PNG, JPEG or WebP image.');return;}
    if(file.size>2000000){setError('Choose an image smaller than 2 MB.');return;}
    setUploading(n=>n+1);setError('');
    try {const image=await createImageBitmap(file);const scale=Math.min(1,1200/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();let value=canvas.toDataURL('image/webp',.8);if(value.length>240000)value=canvas.toDataURL('image/webp',.5);if(value.length>300000)throw new Error('Choose a smaller photo or use an image URL.');apply(value);}
    catch(error){setError(error.message||'Unable to read this image.');}finally{setUploading(n=>n-1);}
  };
  const override = (kind,id,key,value) => change(`${kind}_overrides`,list=>{const existing=list.find(person=>person.id===id)||{id};return [...list.filter(person=>person.id!==id),{...existing,[key]:value}];});
  const preview = useMemo(()=>{
    if(!editing||!draft)return gym;
    const result={...gym,...draft,name:draft.name||gym.name,address:[draft.address,draft.city,draft.state,draft.pincode].filter(value=>value&&value.trim()).join(', ')||null};
    for(const kind of ['trainer','owner'])result[`${kind}s`]=(data[`${kind}s`]||[]).map(person=>{const custom=draft[`${kind}_overrides`].find(item=>item.id===person.id)||{};return {...person,photo_url:custom.photo_url||person.photo_url,bio:custom.bio??person.bio,websiteHidden:draft[`hidden_${kind}_ids`].includes(person.id)};});
    return result;
  },[gym,editing,draft,data]);
  const value={editing,loginOpen,setLoginOpen,busy,uploading,dirty,error,message,token,draft,data,preview,change,changeMany,start,signIn,save,cancel,signOut,upload,override};
  return <EditingContext.Provider value={value}><div className={editing ? "gym-edit-session" : undefined} style={{"--gym-edit-bar-height":`${barHeight}px`}}>{editing ? <div ref={barRef} className="gym-edit-bar" role="region" aria-label="Website editing controls"><div><span className="gym-edit-status-dot"/><strong ref={headingRef} tabIndex={-1}>Editing your website</strong><small>{uploading ? 'Uploading image…' : dirty ? 'Unsaved changes' : 'Make changes directly on the page'}</small></div><div><button type="button" disabled={busy||uploading>0} onClick={cancel}>Cancel</button><button type="button" className="gym-inline-primary" disabled={busy||uploading>0||!dirty} onClick={save}>{busy?'Saving…':'Save changes'}</button><button type="button" disabled={busy||uploading>0} onClick={signOut}>Sign out</button></div>{error ? <p role="alert">{error}</p>:null}</div>:null}<div className={editing?'gym-site-in-edit-mode':''}>{children}</div></div></EditingContext.Provider>;
}

export default function GymWebsiteEditor() {
  const editor=useGymWebsiteEditor();
  return <div className="gym-manage-area">{!editor.editing ? <button className="gym-site-edit-link" disabled={editor.busy} onClick={editor.start}>Manage gym website</button>:null}{editor.message ? <p role="status">{editor.message}</p>:null}{!editor.editing&&editor.error ? <p className="gym-inline-error" role="alert">{editor.error}</p>:null}{editor.loginOpen ? <form className="gym-inline-login" onSubmit={editor.signIn}><div><h3>Sign in to edit this website</h3><button type="button" aria-label="Close sign in" disabled={editor.busy} onClick={()=>editor.setLoginOpen(false)}><X size={18}/></button></div><p>For this gym's owner and super admins/developers.</p><label>Email<input name="email" type="email" autoComplete="username" required autoFocus/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="gym-inline-primary" disabled={editor.busy}>{editor.busy?'Signing in…':'Sign in to edit'}</button></form>:null}</div>;
}

export function InlineDescription() {
  const editor=useGymWebsiteEditor();
  return <label className="gym-inline-description"><span>About your gym</span><textarea maxLength={4000} value={editor.draft.description||''} placeholder="Tell visitors about your gym" onChange={event=>editor.change('description',event.target.value)} disabled={editor.busy}/></label>;
}

export function InlineList({field,title,children}) {
  const editor=useGymWebsiteEditor();
  const [value,setValue]=useState('');
  if(!editor?.editing)return children;
  const items=editor.draft[field];
  return <div className="gym-inline-list" aria-label={`Edit ${title}`}><div className={field==='categories'?'gym-site-activities':'gym-site-facilities'}>{items.map((item,index)=><article key={index} className="gym-inline-list-card"><label><span>{title} {index+1}</span><input aria-label={`${title} ${index+1}`} value={item} maxLength={160} disabled={editor.busy} onChange={event=>editor.change(field,values=>values.map((value,i)=>i===index?event.target.value:value))}/></label><button type="button" aria-label={`Remove ${title} ${index+1}`} disabled={editor.busy} onClick={()=>editor.change(field,values=>values.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></article>)}</div><form className="gym-inline-add" onSubmit={event=>{event.preventDefault();if(value.trim()){editor.change(field,values=>[...values,value.trim()]);setValue('');}}}><input aria-label={`New ${title.toLowerCase()}`} placeholder={`Add ${title.toLowerCase()}`} value={value} maxLength={160} disabled={editor.busy} onChange={event=>setValue(event.target.value)}/><button type="submit" disabled={editor.busy||!value.trim()}><Plus size={16}/> Add</button></form></div>;
}

export function InlinePhotos({field,title,max}) {
  const editor=useGymWebsiteEditor();
  if(!editor?.editing)return null;
  const photos=editor.draft[field];
  const update=(index,key,value)=>editor.change(field,current=>current.map((photo,i)=>i===index?{...photo,[key]:value}:photo));
  return <div className="gym-inline-photos" aria-label={`Edit ${title}`}><div className="gym-inline-section-tools"><div><strong>{title}</strong><small>{field==='hero_photos'?'Two or more images automatically slide right to left every 5 seconds.':'Photos appear here as you add them.'}</small></div><button type="button" disabled={editor.busy||photos.length>=max} onClick={()=>editor.change(field,current=>[...current,{url:'',caption:''}])}><Plus size={16}/> Add {field==='hero_photos'?'background':'photo'}</button></div><div className="gym-inline-photo-grid">{photos.map((photo,index)=><article key={index}>{photo.url?<img src={photo.url} alt={photo.caption||`${title} ${index+1}`}/>:<div className="gym-inline-photo-empty"><ImagePlus size={28}/><span>Choose an image</span></div>}<div><label className="gym-inline-upload">{photo.url?'Replace image':'Upload image'}<input aria-label={`Upload ${title.toLowerCase()} ${index+1}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={editor.busy||editor.uploading>0} onChange={event=>editor.upload(event.target.files[0],value=>update(index,'url',value))}/></label><label>Image URL<input aria-label={`${title} ${index+1} URL`} value={photo.url.startsWith('data:')?'':photo.url} placeholder={photo.url.startsWith('data:')?'Uploaded image':'https://…'} disabled={editor.busy} onChange={event=>update(index,'url',event.target.value)}/></label><label>Description<input maxLength={240} aria-label={`${title} ${index+1} description`} value={photo.caption||''} disabled={editor.busy} onChange={event=>update(index,'caption',event.target.value)}/></label><button type="button" aria-label={`Remove ${title.toLowerCase()} ${index+1}`} disabled={editor.busy||editor.uploading>0} onClick={()=>editor.change(field,current=>current.filter((_,i)=>i!==index))}><Trash2 size={16}/> Remove</button></div></article>)}</div></div>;
}

export function InlinePerson({person,kind}) {
  const editor=useGymWebsiteEditor();
  if(!editor?.editing)return null;
  const hidden=editor.draft[`hidden_${kind}_ids`].includes(person.id);
  const custom=editor.draft[`${kind}_overrides`].find(item=>item.id===person.id)||{};
  return <div className="gym-inline-person"><button type="button" disabled={editor.busy} onClick={()=>editor.change(`hidden_${kind}_ids`,ids=>hidden?ids.filter(id=>id!==person.id):[...ids,person.id])}>{hidden?<Plus size={16}/>:<Trash2 size={16}/>} {hidden?'Show on website':'Hide from website'}</button>{!hidden?<><label>Public bio<textarea aria-label={`Bio for ${person.full_name}`} maxLength={1200} value={custom.bio??person.bio??''} disabled={editor.busy} onChange={event=>editor.override(kind,person.id,'bio',event.target.value)}/></label><label>Photo URL<input aria-label={`Photo URL for ${person.full_name}`} value={(custom.photo_url||'').startsWith('data:')?'':custom.photo_url||''} placeholder="Use gym profile photo" disabled={editor.busy} onChange={event=>editor.override(kind,person.id,'photo_url',event.target.value||null)}/></label><label className="gym-inline-upload">Replace photo<input aria-label={`Upload photo for ${person.full_name}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={editor.busy||editor.uploading>0} onChange={event=>editor.upload(event.target.files[0],value=>editor.override(kind,person.id,'photo_url',value))}/></label></>:<small>Hidden from visitors. Save changes to apply.</small>}</div>;
}

export function InlineContact() {
  const editor=useGymWebsiteEditor();
  const {draft,change,busy}=editor;
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const hours=draft.opening_hours||{};
  const nextDay=days.find(day=>!Object.keys(hours).some(key=>key.toLowerCase()===day.toLowerCase()));
  const setDay=(day,value)=>change('opening_hours',current=>({...current,[day]:value}));
  return <div className="gym-inline-contact" aria-label="Edit contact information"><div className="gym-inline-contact-fields"><label>Gym name<input aria-label="Gym name" maxLength={180} minLength={2} value={draft.name||''} disabled={busy} onChange={event=>change('name',event.target.value)}/></label><label>Street address<textarea aria-label="Street address" maxLength={500} value={draft.address||''} disabled={busy} onChange={event=>change('address',event.target.value||null)}/></label><div className="gym-inline-contact-pair"><label>City<input value={draft.city||''} maxLength={120} disabled={busy} onChange={event=>change('city',event.target.value||null)}/></label><label>State<input value={draft.state||''} maxLength={120} disabled={busy} onChange={event=>change('state',event.target.value||null)}/></label></div><label>Postal code<input aria-label="Postal code" value={draft.pincode||''} maxLength={20} disabled={busy} onChange={event=>change('pincode',event.target.value||null)}/></label><label>Phone number<input type="tel" aria-label="Phone number" autoComplete="tel" value={draft.business_phone||''} maxLength={40} disabled={busy} onChange={event=>change('business_phone',event.target.value||null)}/></label><label>Email address<input type="email" aria-label="Contact email" autoComplete="email" value={draft.business_email||''} disabled={busy} onChange={event=>change('business_email',event.target.value||null)}/></label><div className="gym-inline-section-tools"><strong>Opening hours</strong><button type="button" disabled={busy||!nextDay} onClick={()=>setDay(nextDay,{open:'06:00',close:'22:00',closed:false})}><Plus size={16}/> Add day</button></div>{Object.entries(hours).map(([day,value])=>{const closed=typeof value==='object'&&value?.closed;return <div className="gym-inline-hours-row" key={day}><div><b>{day}</b><button type="button" disabled={busy} aria-label={`Remove hours for ${day}`} onClick={()=>change('opening_hours',current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==day)))}><Trash2 size={16}/></button></div><label className="gym-inline-closed"><input type="checkbox" checked={Boolean(closed)} disabled={busy} onChange={event=>setDay(day,event.target.checked?{closed:true}:{open:'06:00',close:'22:00',closed:false})}/> Closed</label>{!closed ? typeof value==='string' ? <label>Hours<input aria-label={`${day} hours`} value={value} maxLength={100} disabled={busy} onChange={event=>setDay(day,event.target.value)}/></label> : <div className="gym-inline-contact-pair"><label>Opens<input type="time" aria-label={`${day} opening time`} value={value?.open||''} disabled={busy} onChange={event=>setDay(day,{...value,open:event.target.value})}/></label><label>Closes<input type="time" aria-label={`${day} closing time`} value={value?.close||''} disabled={busy} onChange={event=>setDay(day,{...value,close:event.target.value})}/></label></div>:null}</div>;})}{!Object.keys(hours).length?<small>Add your opening days and hours.</small>:null}</div></div>;
}

export function InlineLocation() {
  const editor=useGymWebsiteEditor();
  const {draft,change,busy}=editor;
  return <div className="gym-inline-location"><strong>Map location</strong><p>Click the map or drag the pin to set your gym's location.</p><div className="gym-inline-contact-pair"><label>Latitude<input aria-label="Latitude" type="number" step="any" min={-90} max={90} value={draft.latitude??''} disabled={busy} onChange={event=>change('latitude',event.target.value===''?null:Number(event.target.value))}/></label><label>Longitude<input aria-label="Longitude" type="number" step="any" min={-180} max={180} value={draft.longitude??''} disabled={busy} onChange={event=>change('longitude',event.target.value===''?null:Number(event.target.value))}/></label></div><button type="button" disabled={busy} onClick={()=>editor.changeMany({latitude:null,longitude:null})}>Remove map location</button></div>;
}
