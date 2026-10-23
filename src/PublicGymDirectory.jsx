import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Crosshair, GitCompareArrows, MapPin, Navigation, Search, Star } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ownerApi } from './api';
import { gymPageUrl } from './gymPageUrl';
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
      {located.map((gym) => <Marker key={gym.id} position={[+gym.latitude, +gym.longitude]} icon={selected === gym.id ? selectedGymMarkerIcon : gymMarkerIcon} eventHandlers={{ click: () => onSelect(gym.id) }}><Popup><a href={gymPageUrl(gym)}><b>{gym.name}</b></a><br/>{gym.address || 'PulseFit registered gym'}{gym.distance_km != null ? <><br/>{gym.distance_km} km away</> : null}</Popup></Marker>)}
    </MapContainer>
    {!located.length ? <div className="map-empty"><MapPin size={28}/><b>Gym locations are being added</b><span>Showing Pune until owners publish coordinates.</span></div> : null}
    <small className="map-note">PulseFit gyms · OpenStreetMap</small>
  </div>;
}

function GymLocationControl({ latitude, longitude, onLocationChange }) {
  const map = useMapEvents({ click: (event) => { if (onLocationChange) onLocationChange({latitude:event.latlng.lat,longitude:event.latlng.lng}); } });
  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) map.setView([latitude,longitude],Math.max(map.getZoom(),15));
  },[map,latitude,longitude]);
  return null;
}

export function GymDetailMap({ gym, onLocationChange }) {
  const hasLocation = hasCoordinates(gym);
  const center = hasLocation ? [+gym.latitude, +gym.longitude] : [18.5204, 73.8567];
  return <div className={`detail-map${onLocationChange ? " gym-map-editing" : ""}`} aria-label={`${gym.name} location map`}>
    <MapContainer center={center} zoom={hasLocation ? 15 : 11} scrollWheelZoom className="leaflet-discovery-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <GymLocationControl latitude={hasLocation ? +gym.latitude : null} longitude={hasLocation ? +gym.longitude : null} onLocationChange={onLocationChange}/>
      {hasLocation ? <Marker position={center} icon={selectedGymMarkerIcon} draggable={Boolean(onLocationChange)} eventHandlers={{dragend:(event)=>{const point=event.target.getLatLng();onLocationChange?.({latitude:point.lat,longitude:point.lng});}}}>
        <Tooltip permanent direction="right" offset={[20, -25]} className="gym-name-tooltip"><b>{gym.name}</b></Tooltip>
      </Marker> : null}
    </MapContainer>
    {!hasLocation ? <div className="detail-map-empty"><MapPin size={30}/><b>Location coming soon</b><span>{onLocationChange ? 'Click the map to place your gym pin.' : gym.address || 'The gym owner has not published coordinates yet.'}</span></div> : null}
    <small className="map-note">{gym.name} · OpenStreetMap</small>
  </div>;
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
  const compared = compare.map((id) => gyms.find((gym) => gym.id === id)).filter(Boolean);
  return <section className="public-gym-directory section-pad" id="gyms"><div className="shell">
    <div className="discovery-heading"><div><span className="eyebrow">PulseFit gym marketplace</span><h2>Find a Gym Near You</h2><p>Discover registered PulseFit gyms. Compare distance, plans, facilities and ratings to find the right fit.</p></div><button className="btn btn-dark" onClick={useLocation} disabled={state.locating}><Crosshair size={17}/>{state.locating ? 'Finding you…' : 'Use my location'}</button></div>
    <div className="discovery-toolbar"><label className="discovery-search"><Search/><input aria-label="Search gyms" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area, gym, facility or plan"/></label><div className="filter-chips"><button aria-pressed={distance === 'all'} className={distance === 'all' ? 'active' : ''} onClick={() => setDistance('all')}>Any distance</button>{[2,5,10].map((km) => <button disabled={!location || state.loading} title={!location ? 'Use your location to filter by distance' : undefined} aria-pressed={distance === String(km)} className={distance === String(km) ? 'active' : ''} onClick={() => setDistance(String(km))} key={km}>Under {km} km</button>)}<button aria-pressed={verifiedOnly} className={verifiedOnly ? 'active' : ''} onClick={() => setVerifiedOnly(!verifiedOnly)}><BadgeCheck size={14}/> Verified</button></div></div>
    {!location ? <p className="location-notice">Choose “Use my location” to filter gyms by distance.</p> : null}
    {state.error ? <div className="location-notice" role="alert">{state.error} <button disabled={state.loading} onClick={() => load()}>Retry</button></div> : null}
    <div className="discovery-layout"><MapCanvas gyms={visible} location={location} selected={selected} onSelect={setSelected}/><div className="nearby-list"><div className="nearby-head"><div><b>{location ? 'Nearby gyms' : 'Registered gyms'}</b><small>{visible.length} result{visible.length === 1 ? '' : 's'}{location ? ' · nearest first' : ''}</small></div>{compare.length > 1 ? <button onClick={() => document.getElementById('gym-comparison')?.scrollIntoView({ behavior: 'smooth' })}><GitCompareArrows size={15}/> Compare {compare.length}</button> : null}</div>{state.loading ? <p className="operations-empty">Loading gyms…</p> : visible.map((gym) => <article className={`discovery-card ${selected === gym.id ? 'selected' : ''}`} key={gym.id} onClick={() => { window.location.href = gymPageUrl(gym); }}><div className="card-top"><div><h3>{gym.name}</h3><small><MapPin size={12}/>{gym.address || 'Address coming soon'}</small></div>{gym.verified ? <BadgeCheck className="verified-icon"/> : null}</div><div className="card-facts">{gym.distance_km != null ? <span><Navigation size={14}/>{gym.distance_km} km</span> : null}<span><Star size={14}/>{gym.rating || 'New'}</span><span>{money(gym.starting_price_cents)}</span></div><div className="facility-pills">{(gym.facilities || []).slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div><div className="card-actions"><a className="gym-website-link" href={gymPageUrl(gym)} onClick={(e) => e.stopPropagation()}>Visit gym website</a><label onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Compare ${gym.name}`} disabled={compare.length >= 3 && !compare.includes(gym.id)} checked={compare.includes(gym.id)} onChange={() => toggleCompare(gym.id)}/> Compare</label></div></article>)}{!state.loading && !visible.length ? <p className="operations-empty">No gyms match these filters.</p> : null}</div></div>
    {compared.length > 1 ? <div className="comparison" id="gym-comparison"><div className="comparison-head"><div><span className="eyebrow">Side by side</span><h3>Compare gyms</h3></div><button onClick={() => setCompare([])}>Clear comparison</button></div><div className="comparison-table"><div><b>Gym</b>{compared.map((gym) => <strong key={gym.id}>{gym.name}</strong>)}</div><div><b>Distance</b>{compared.map((gym) => <span key={gym.id}>{gym.distance_km != null ? `${gym.distance_km} km` : 'Location needed'}</span>)}</div><div><b>Starting price</b>{compared.map((gym) => <span key={gym.id}>{money(gym.starting_price_cents)}</span>)}</div><div><b>Rating</b>{compared.map((gym) => <span key={gym.id}>{gym.rating || 'New'}</span>)}</div><div><b>Verified</b>{compared.map((gym) => <span key={gym.id}>{gym.verified ? 'Yes' : 'Pending'}</span>)}</div></div></div> : null}
  </div></section>;
}
