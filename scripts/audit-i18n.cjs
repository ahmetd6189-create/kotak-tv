const ts=require('typescript'),fs=require('fs'),path=require('path');
const dictionary=require('../src/ui/translations.json');
const entries=new Map();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);}
for(const file of ['App.tsx',...walk('src/ui'),...walk('src/native'),...walk('src/components')]){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function visit(n){let text;
 if(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))text=n.text;
 if(ts.isTemplateExpression(n))text=n.head.text+n.templateSpans.map((span,i)=>'{'+i+'}'+span.literal.text).join('');
 if(text){text=text.trim().replace(/\s+/g,' ');if(text&&/[çğıöşüÇĞİÖŞÜ]/.test(text)&&!dictionary[text]&&text.length>3){const set=entries.get(text)||new Set();set.add(file+':'+(source.getLineAndCharacterOfPosition(n.getStart()).line+1));entries.set(text,set);}}
 ts.forEachChild(n,visit);}
 visit(source);
}
const result=[...entries].map(([text,files])=>({text,files:[...files]}));
fs.mkdirSync('work-notes',{recursive:true});fs.writeFileSync('work-notes/i18n-review.json',JSON.stringify(result,null,2)+'\n');
console.log(`${Object.keys(dictionary).length} dictionary entries; ${result.length} Turkish candidates need review (includes internal commands and provider labels).`);
