/**
 * Formaterar ett datum till "YYYY-MM-DD HH:mm:ss" i användarens lokala tid.
 * 
 * @param {string} isoDate - Datum i ISO-format.
 * @returns {string} - Datum i formaterat format.
 */
const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ''); // Tar bort eventuellt komma mellan datum och tid
  };
  
  /**
   * Omstrukturerar en anteckning för att följa en specifik fältordning.
   * 
   * @param {Object} note - Anteckningen som ska formateras.
   * @returns {Object} - Den formaterade anteckningen.
   */
  const formatNote = (note) => {
    const formattedNote = {
      userId: note.userId,
      id: note.id,
      createdAt: formatDate(note.createdAt), // Formatera createdAt
    };
  
    // Lägg till modifiedAt direkt efter createdAt om den har blivit ändrad
    if (note.modifiedAt && note.modifiedAt !== note.createdAt) {
      formattedNote.modifiedAt = formatDate(note.modifiedAt);
    }
  
    // Lägg till restoredAt om den finns
    if (note.restoredAt || note.deletedAt) {
      formattedNote.restoredAt = formatDate(note.restoredAt || note.deletedAt);
    }
  
    // Lägg till övriga fält i ordning
    formattedNote.title = note.title;
    formattedNote.text = note.text;
  
    return formattedNote;
  };
  
  export default formatNote;  