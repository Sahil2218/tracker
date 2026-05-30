export async function fetchTracker(year, month) {
  const response = await fetch('/api/tracker?year=' + year + '&month=' + month);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to load tracker data');
  }
  return data.tracker || {};
}

export async function saveTrackerEntry(entry) {
  const response = await fetch('/api/tracker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to save tracker data');
  }
  return data.tracker || {};
}
