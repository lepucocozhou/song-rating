// Backup file: all songs, albums and settings in one JSON file. Restoring merges by id.

function backupData() {
  return { app: 'song-rating', version: 2, exportedAt: new Date().toISOString(),
    songs: Songs.all(), albums: Albums.all(), config: store.get('songRatingConfig', null) };
}

function mergeById(current, incoming) {
  const byId = new Map(current.map(r => [r.id, r]));
  incoming.forEach(r => byId.set(r.id, r));
  return [...byId.values()];
}

function initBackupButtons(saveBtn, loadBtn, fileInput, toast, onDone) {
  saveBtn.onclick = () => {
    const date = new Date().toISOString().slice(0, 10);
    download(`song-rating-backup-${date}.json`, JSON.stringify(backupData(), null, 1), 'application/json');
  };
  loadBtn.onclick = () => fileInput.click();
  fileInput.onchange = async e => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      // Backups of the first version were just a list of songs
      const songs = Array.isArray(data) ? data : data.songs || [];
      const albums = Array.isArray(data) ? [] : data.albums || [];
      if (!Array.isArray(songs) || !Array.isArray(albums)) throw new Error('unknown format');
      Songs.saveAll(mergeById(Songs.all(), songs));
      Albums.saveAll(mergeById(Albums.all(), albums));
      let msg = `${songs.length} Songs und ${albums.length} Alben geladen.`;
      if (data.config && confirm('Das Backup enthält auch Einstellungen (Fragen, Gewichte). Diese ebenfalls übernehmen?')) {
        Config.save(data.config);
        msg += ' Einstellungen übernommen – die Seite lädt neu.';
        setTimeout(() => location.reload(), 1200);
      }
      toast.textContent = msg;
      onDone();
    } catch (err) {
      alert('Die Datei konnte nicht gelesen werden.');
    }
    e.target.value = '';
  };
}
