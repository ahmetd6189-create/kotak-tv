// In-memory substitute used only by component tests.
const values=new Map();
exports.setItemAsync=async(k,v)=>{values.set(k,v)};
exports.getItemAsync=async k=>values.get(k)||null;
exports.deleteItemAsync=async k=>{values.delete(k)};
