export function hasCoordinates(gym) {
  return gym.latitude != null && gym.longitude != null &&
    String(gym.latitude).trim() !== '' && String(gym.longitude).trim() !== '' &&
    Number.isFinite(Number(gym.latitude)) && Math.abs(Number(gym.latitude)) <= 90 &&
    Number.isFinite(Number(gym.longitude)) && Math.abs(Number(gym.longitude)) <= 180;
}

export function filterGyms(gyms, { query = '', verifiedOnly = false, distance = 'all', location = null } = {}) {
  const search = query.trim().toLowerCase();
  return gyms.filter((gym) => {
    const text = [gym.name, gym.code, gym.address, gym.business_email, gym.plan_name,
      ...(gym.facilities || []), ...(gym.categories || [])].join(' ').toLowerCase();
    return (!search || text.includes(search)) && (!verifiedOnly || gym.verified) &&
      (!location || distance === 'all' || gym.distance_km != null && gym.distance_km <= Number(distance));
  });
}
