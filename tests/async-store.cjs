const data=new Map();module.exports={getItem:async key=>data.get(key)??null,setItem:async(key,value)=>{data.set(key,value)},removeItem:async key=>{data.delete(key)}};
