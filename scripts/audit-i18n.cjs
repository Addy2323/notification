const ts = require('../node_modules/typescript');
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '../frontend');
const files = [];
function walk(dir) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(p.endsWith('.tsx')) files.push(p); } }
walk(path.join(root,'app')); walk(path.join(root,'components'));
const entries=new Map();
const attrs=new Set(['placeholder','title','alt','aria-label','message','description','label']);
function add(value,file,kind) { const text=value.replace(/\s+/g,' ').trim(); if(!/[A-Za-z]{2}/.test(text) || text.length<2 || /^(LUMO|TZS|TSh|SMS|WhatsApp|English|Kiswahili|PIN|OTP|PDF|Excel|SKU|API|iPhone|Android|Chrome|Safari)$/.test(text)) return;
const key=text; if(!entries.has(key)) entries.set(key,{text,files:[],kinds:[]});const e=entries.get(key);if(!e.files.includes(file))e.files.push(file);if(!e.kinds.includes(kind))e.kinds.push(kind); }
for(const file of files) { const rel=path.relative(root,file).replaceAll('\\','/');const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node) {
  if(ts.isJsxText(node))add(node.text,rel,'jsx');
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)) {
   const p=node.parent;
   if(ts.isJsxAttribute(p)&&attrs.has(p.name.getText(source)))add(node.text,rel,'attribute');
   if(ts.isPropertyAssignment(p)&& /^(label|title|description|placeholder|message|text|confirmButtonText|cancelButtonText|name)$/.test(p.name.getText(source))&&!/[\/]|^#|^text-|^bg-/.test(node.text))add(node.text,rel,'config');
   if(ts.isJsxExpression(p)||ts.isConditionalExpression(p)||ts.isBinaryExpression(p)&&p.operatorToken.kind===ts.SyntaxKind.BarBarToken||ts.isNewExpression(p)&&p.expression.getText(source)==='Error')add(node.text,rel,'expression');
  }
  ts.forEachChild(node,visit);
 } visit(source);
}
const sorted=[...entries.values()].sort((a,b)=>a.text.localeCompare(b.text));fs.writeFileSync(path.join(__dirname,process.argv[2] || 'i18n-audit.json'),JSON.stringify(sorted,null,2));
process.stdout.write(JSON.stringify({files:files.length,strings:sorted.length,short:sorted.filter(e=>e.text.length<95).length}));
