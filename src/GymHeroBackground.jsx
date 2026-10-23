import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const EMPTY_PHOTOS = [];
export default function GymHeroBackground({ photos = EMPTY_PHOTOS }) {
  const [index, setIndex] = useState(0);
  const [jump, setJump] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [failed, setFailed] = useState([]);
  const usable = photos.filter((photo) => photo.url && !failed.includes(photo.url));
  const count = usable.length;
  const autoPlay = count > 1 && !paused && !hovered && !hidden;
  useEffect(() => { setIndex(0); setJump(true); setFailed([]); }, [photos]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = (event) => setReducedMotion(event.matches);
    const visibility = () => setHidden(document.hidden);
    media.addEventListener('change',motion); document.addEventListener('visibilitychange',visibility);
    return () => { media.removeEventListener('change',motion); document.removeEventListener('visibilitychange',visibility); };
  }, []);
  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => { setJump(false); setIndex((current) => (current >= count ? 1 : current + 1)); },5000);
    return () => window.clearInterval(timer);
  }, [autoPlay,count]);
  if (!count) return null;
  const position = Math.min(index,count);
  const slides = count > 1 ? [...usable,usable[0]] : usable;
  return <><div className="gym-hero-background" aria-hidden="true"><div className={`gym-hero-track${jump || reducedMotion ? ' no-transition' : ''}`} style={{transform:`translateX(-${position * 100}%)`}} onTransitionEnd={(event) => { if (event.target === event.currentTarget && position === count) { setJump(true); setIndex(0); } }}>{slides.map((photo,i) => <div className="gym-hero-slide" key={`${i}-${photo.url}`}><img src={photo.url} alt="" onError={() => { setFailed((current) => [...current,photo.url]); setIndex(0); setJump(true); }}/></div>)}</div></div>{count > 1 ? <div className="gym-hero-controls" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}><div role="group" aria-label="Gym background images">{usable.map((photo,i) => <button key={i} type="button" aria-label={`Show background image ${i + 1}`} aria-pressed={position % count === i} onClick={() => { setJump(true); setIndex(i); }}><span/></button>)}</div>{count > 1 ? <button className="gym-hero-pause" type="button" aria-label={paused ? 'Play background slideshow' : 'Pause background slideshow'} onClick={() => setPaused(!paused)}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button> : null}</div> : null}</>;
}
