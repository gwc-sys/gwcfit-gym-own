import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Building2, Check, Crosshair, GitCompareArrows, MapPin, Navigation, Phone, Search, Star, X } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ownerApi } from './api';
import useModal from './useModal';
import { hasCoordinates, filterGyms } from './directoryUtils';

const money = (cents) => cents == null ? 'Contact gym' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100);

const gymMarkerIcon = L.divIcon({ className: 'leaflet-gym-marker', html: '<span></span>', iconSize: [34, 42], iconAnchor: [17, 42], popupAnchor: [0, -38] });
const selectedGymMarkerIcon = L.divIcon({ className: 'leaflet-gym-marker selected', html: '<span></span>', iconSize: [40, 48], iconAnchor: [20, 48], popupAnchor: [0, -43] });
const memberMarkerIcon = L.divIcon({ className: 'leaflet-member-marker', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -15] });

function FitMap({ gyms, location, selected }) {
  const map = useMap();
  useEffect(() => {
    const selectedGym = gyms.find((gym) => gym.id === selected);
    if (selectedGym) { map.flyTo([+selectedGym.latitude, +selectedGym.longitude], Math.max(map.getZoom(), 14), { duration: .6 }); return; }
    const points = gyms.map((gym) => [+gym.latitude, +gym.longitude]);
    if (location) points.push([location.latitude, location.longitude]);
    if (points.length === 1) map.setView(points[0], 14);
    if (points.length > 1) map.fitBounds(points, { padding: [45, 45], maxZoom: 15 });
  }, [gyms, location, selected, map]);
  return null;
}

function MapCanvas({ gyms, location, selected, onSelect }) {
  const located = gyms.filter(hasCoordinates);
  const center = location ? [location.latitude, location.longitude] : located.length ? [+located[0].latitude, +located[0].longitude] : [18.5204, 73.8567];
  return <div className="discovery-map" aria-label="Interactive map of registered PulseFit gyms">
    <MapContainer center={center} zoom={located.length || location ? 13 : 11} scrollWheelZoom className="leaflet-discovery-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <FitMap gyms={located} location={location} selected={selected}/>
      {location ? <Marker position={[location.latitude, location.longitude]} icon={memberMarkerIcon}><Popup><b>Your location</b></Popup></Marker> : null}
      {located.map((gym) => <Marker key={gym.id} position={[+gym.latitude, +gym.longitude]} icon={selected === gym.id ? selectedGymMarkerIcon : gymMarkerIcon} eventHandlers={{ click: () => onSelect(gym.id) }}><Popup><b>{gym.name}</b><br/>{gym.address || 'PulseFit registered gym'}{gym.distance_km != null ? <><br/>{gym.distance_km} km away</> : null}</Popup></Marker>)}
    </MapContainer>
    {!located.length ? <div className="map-empty"><MapPin size={28}/><b>Gym locations are being added</b><span>Showing Pune until owners publish coordinates.</span></div> : null}
    <small className="map-note">PulseFit gyms · OpenStreetMap</small>
  </div>;
}

function GymDetailMap({ gym }) {
  const hasLocation = hasCoordinates(gym);
  const center = hasLocation ? [+gym.latitude, +gym.longitude] : [18.5204, 73.8567];
  return <div className="detail-map" aria-label={`${gym.name} location map`}>
    <MapContainer center={center} zoom={hasLocation ? 15 : 11} scrollWheelZoom className="leaflet-discovery-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {hasLocation ? <Marker position={center} icon={selectedGymMarkerIcon}>
        <Tooltip permanent direction="right" offset={[20, -25]} className="gym-name-tooltip"><b>{gym.name}</b></Tooltip>
      </Marker> : null}
    </MapContainer>
    {!hasLocation ? <div className="detail-map-empty"><MapPin size={30}/><b>Location coming soon</b><span>{gym.address || 'The gym owner has not published coordinates yet.'}</span></div> : null}
    <small className="map-note">{gym.name} · OpenStreetMap</small>
  </div>;
}

function GymDetails({ gym, onClose }) {
  const dialogRef = useModal(Boolean(gym), onClose);
  if (!gym) return null;
  const directions = hasCoordinates(gym) ? `https://www.google.com/maps/dir/?api=1&destination=${gym.latitude},${gym.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address || gym.name)}`;
  const joinContact = gym.business_phone ? `tel:${gym.business_phone}` : gym.business_email ? `mailto:${gym.business_email}?subject=${encodeURIComponent(`Membership inquiry for ${gym.name}`)}` : null;
  return <div className="gym-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><article ref={dialogRef} tabIndex={-1} className="gym-detail-panel" role="dialog" aria-modal="true" aria-labelledby="gym-detail-title">
    <button className="detail-close" onClick={onClose} aria-label="Close gym profile"><X/></button>
    <GymDetailMap gym={gym}/>
    <div className="detail-content"><div className="detail-cover"><Building2 size={42}/>{gym.verified ? <span><BadgeCheck size={16}/> PulseFit Verified</span> : null}</div>
    <div className="detail-body"><small>{gym.code}</small><h2 id="gym-detail-title">{gym.name}</h2><div className="detail-meta"><span><Star size={15} fill="currentColor"/>{gym.rating || 'New'} {gym.review_count ? `(${gym.review_count})` : ''}</span>{gym.distance_km != null ? <span><Navigation size={15}/>{gym.distance_km} km away</span> : null}</div><p>{gym.description || 'This PulseFit gym is preparing its full public profile.'}</p>
      <div className="detail-actions"><a className="btn btn-dark" href={directions} target="_blank" rel="noreferrer"><Navigation size={16}/> Get directions</a>{gym.business_phone ? <a className="btn btn-outline" href={`tel:${gym.business_phone}`}><Phone size={16}/> Call gym</a> : null}{joinContact ? <a className="btn btn-outline" href={joinContact}>Contact to join</a> : null}</div>
      <h3>Facilities</h3><div className="facility-list">{gym.facilities?.length ? gym.facilities.map((item) => <span key={item}><Check size={14}/>{item}</span>) : <span>Facilities will be published soon.</span>}</div>
      <h3>Membership</h3><div className="membership-preview"><b>{money(gym.starting_price_cents)}</b><span>{gym.starting_price_cents != null ? 'starting monthly price' : 'for membership pricing'}</span>{gym.trial_available ? <em>Free trial available</em> : null}</div>
      <h3>Gym contact</h3><p className="business-contact">{gym.business_email || 'Email not published'}{gym.business_phone ? ` · ${gym.business_phone}` : ''}</p>
    </div></div></article></div>;
}

export default function PublicGymDirectory({ onListedCount }) {
  const [gyms, setGyms] = useState([]), [location, setLocation] = useState(null), [query, setQuery] = useState(''), [distance, setDistance] = useState('all'), [verifiedOnly, setVerifiedOnly] = useState(false), [selected, setSelected] = useState(null), [compare, setCompare] = useState([]);
  const [state, setState] = useState({ loading: true, error: '', locating: false });
  const requestVersion = useRef(0);
  const load = (nextLocation = location) => {
    const version = ++requestVersion.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    return ownerApi.publicGyms(nextLocation)
      .then((items) => { if (version === requestVersion.current) { setGyms(items); if (!nextLocation) onListedCount?.(items.length); } })
      .catch((error) => { if (version === requestVersion.current) setState((s) => ({ ...s, error: error.message })); })
      .finally(() => { if (version === requestVersion.current) setState((s) => ({ ...s, loading: false })); });
  };
  useEffect(() => { void load(null); return () => { requestVersion.current += 1; }; }, []);
  const useLocation = () => { if (!navigator.geolocation) return setState((s) => ({ ...s, error: 'Location is not supported by this browser.' })); setState((s) => ({ ...s, locating: true, error: '' })); navigator.geolocation.getCurrentPosition(({ coords }) => { const next = { latitude: coords.latitude, longitude: coords.longitude }; setLocation(next); setState((s) => ({ ...s, locating: false })); load(next); }, () => setState((s) => ({ ...s, locating: false, error: 'Location access was not allowed. You can still search all PulseFit gyms.' })), { enableHighAccuracy: true, timeout: 10000 }); };
  const visible = useMemo(() => filterGyms(gyms, { query, verifiedOnly, distance, location }), [gyms, query, distance, verifiedOnly, location]);
  const toggleCompare = (id) => setCompare((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length < 3 ? [...items, id] : items);
  const selectedGym = gyms.find((gym) => gym.id === selected), compared = compare.map((id) => gyms.find((gym) => gym.id === id)).filter(Boolean);
  return <section className="public-gym-directory section-pad" id="gyms"><div className="shell">
    <div className="discovery-heading"><div><span className="eyebrow">PulseFit gym marketplace</span><h2>Find a Gym Near You</h2><p>Discover registered PulseFit gyms. Compare distance, plans, facilities and ratings to find the right fit.</p></div><button className="btn btn-dark" onClick={useLocation} disabled={state.locating}><Crosshair size={17}/>{state.locating ? 'Finding you…' : 'Use my location'}</button></div>
    <div className="discovery-toolbar"><label className="discovery-search"><Search/><input aria-label="Search gyms" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area, gym, facility or plan"/></label><div className="filter-chips"><button aria-pressed={distance === 'all'} className={distance === 'all' ? 'active' : ''} onClick={() => setDistance('all')}>Any distance</button>{[2,5,10].map((km) => <button disabled={!location || state.loading} title={!location ? 'Use your location to filter by distance' : undefined} aria-pressed={distance === String(km)} className={distance === String(km) ? 'active' : ''} onClick={() => setDistance(String(km))} key={km}>Under {km} km</button>)}<button aria-pressed={verifiedOnly} className={verifiedOnly ? 'active' : ''} onClick={() => setVerifiedOnly(!verifiedOnly)}><BadgeCheck size={14}/> Verified</button></div></div>
    {!location ? <p className="location-notice">Choose “Use my location” to filter gyms by distance.</p> : null}
    {state.error ? <div className="location-notice" role="alert">{state.error} <button disabled={state.loading} onClick={() => load()}>Retry</button></div> : null}
    <div className="discovery-layout"><MapCanvas gyms={visible} location={location} selected={selected} onSelect={setSelected}/><div className="nearby-list"><div className="nearby-head"><div><b>{location ? 'Nearby gyms' : 'Registered gyms'}</b><small>{visible.length} result{visible.length === 1 ? '' : 's'}{location ? ' · nearest first' : ''}</small></div>{compare.length > 1 ? <button onClick={() => document.getElementById('gym-comparison')?.scrollIntoView({ behavior: 'smooth' })}><GitCompareArrows size={15}/> Compare {compare.length}</button> : null}</div>{state.loading ? <p className="operations-empty">Loading gyms…</p> : visible.map((gym) => <article className={`discovery-card ${selected === gym.id ? 'selected' : ''}`} key={gym.id} onClick={() => setSelected(gym.id)}><div className="card-top"><div><h3>{gym.name}</h3><small><MapPin size={12}/>{gym.address || 'Address coming soon'}</small></div>{gym.verified ? <BadgeCheck className="verified-icon"/> : null}</div><div className="card-facts">{gym.distance_km != null ? <span><Navigation size={14}/>{gym.distance_km} km</span> : null}<span><Star size={14}/>{gym.rating || 'New'}</span><span>{money(gym.starting_price_cents)}</span></div><div className="facility-pills">{(gym.facilities || []).slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div><div className="card-actions"><button onClick={(e) => { e.stopPropagation(); setSelected(gym.id); }}>View gym</button><label onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Compare ${gym.name}`} disabled={compare.length >= 3 && !compare.includes(gym.id)} checked={compare.includes(gym.id)} onChange={() => toggleCompare(gym.id)}/> Compare</label></div></article>)}{!state.loading && !visible.length ? <p className="operations-empty">No gyms match these filters.</p> : null}</div></div>
    {compared.length > 1 ? <div className="comparison" id="gym-comparison"><div className="comparison-head"><div><span className="eyebrow">Side by side</span><h3>Compare gyms</h3></div><button onClick={() => setCompare([])}>Clear comparison</button></div><div className="comparison-table"><div><b>Gym</b>{compared.map((gym) => <strong key={gym.id}>{gym.name}</strong>)}</div><div><b>Distance</b>{compared.map((gym) => <span key={gym.id}>{gym.distance_km != null ? `${gym.distance_km} km` : 'Location needed'}</span>)}</div><div><b>Starting price</b>{compared.map((gym) => <span key={gym.id}>{money(gym.starting_price_cents)}</span>)}</div><div><b>Rating</b>{compared.map((gym) => <span key={gym.id}>{gym.rating || 'New'}</span>)}</div><div><b>Verified</b>{compared.map((gym) => <span key={gym.id}>{gym.verified ? 'Yes' : 'Pending'}</span>)}</div></div></div> : null}
  </div><GymDetails gym={selectedGym} onClose={() => setSelected(null)}/></section>;
}
