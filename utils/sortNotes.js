/**
 * Sorterar en lista av anteckningar baserat på `createdAt` i fallande ordning.
 * 
 * @param {Array} notes - Listan av anteckningar som ska sorteras.
 * @returns {Array} - Den sorterade listan av anteckningar.
 */
const sortNotes = (notes) => {
    return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };
  
  export default sortNotes;  