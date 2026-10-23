import React from 'react';
import { UserRound } from 'lucide-react';
import { useGymWebsiteEditor, InlinePerson } from './GymWebsiteEditor';

export default function GymTeam({ gym }) {
  const editor = useGymWebsiteEditor();
  return <section className="shell gym-site-section" id="team"><span className="eyebrow">The people behind your progress</span><h2>Meet your team.</h2>{[['owners','Gym owners'],['trainers','Our trainers']].map(([key,title]) => <div key={key} className="gym-team-group"><h3>{title}</h3><div className="gym-team-grid">{gym[key]?.length ? gym[key].map((person) => <article key={person.id} className={person.websiteHidden ? "gym-inline-hidden-person" : undefined}>{person.photo_url ? <img src={person.photo_url} alt={person.full_name} loading="lazy"/> : <div className="gym-person-placeholder"><UserRound size={48}/></div>}<div><h4>{person.full_name}</h4><small>{key === 'owners' ? 'Gym owner' : 'Trainer'}</small>{!editor?.editing && person.bio ? <p>{person.bio}</p> : null}{person.specialties?.length ? <p>{person.specialties.join(' · ')}</p> : null}</div><InlinePerson person={person} kind={key === "owners" ? "owner" : "trainer"}/></article>) : <p>Team profiles will be published soon.</p>}</div></div>)}</section>;
}
