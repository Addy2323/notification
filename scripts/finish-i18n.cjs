const ts=require('../node_modules/typescript'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../frontend'),files=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(f.endsWith('.tsx'))files.push(f);}}walk(path.join(root,'app'));walk(path.join(root,'components'));
const keys=JSON.parse(fs.readFileSync(path.join(root,'locales/source-keys.json'),'utf8'));const candidates=[];
for(const file of files){let text=fs.readFileSync(file,'utf8');if(file.endsWith('LanguageProvider.tsx'))continue;const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let edits=[],needT=false;
 function component(n){while(n){if(ts.isFunctionDeclaration(n)&&n.name&&/^[A-Z]/.test(n.name.text))return n;n=n.parent;}return null;}
 function visit(n){
  if(ts.isJsxText(n)){const value=n.text.replace(/\s+/g,' ').trim();if(keys[value]){edits.push({s:n.pos,e:n.end,v:`${/^\s/.test(n.text)?"{' '}":''}<T k=${JSON.stringify(keys[value])} />${/\s$/.test(n.text)?"{' '}":''}`});needT=true;}return;}
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&/^toLocale(String|DateString|TimeString)$/.test(n.expression.name.text)&&component(n)&&text.includes('label: uiLabel')){
    if(n.arguments.length===0)edits.push({s:n.end-1,e:n.end-1,v:'locale'});
    else if(n.arguments[0].getText(sf)==='[]'||/^['"]en(-US)?['"]$/.test(n.arguments[0].getText(sf)))edits.push({s:n.arguments[0].getStart(sf),e:n.arguments[0].end,v:'locale'});
  }
  if(ts.isTemplateExpression(n)&&component(n)){
    const p=n.parent;let eligible=ts.isJsxExpression(p)&&!(ts.isJsxAttribute(p.parent)&&['className','style','href','src','key','id','value'].includes(p.parent.name.getText(sf)));
    if(ts.isCallExpression(p)&&/set(Error|Success|ModalError|ErrorMsg|ErrorMessage)|window.confirm|alert/.test(p.expression.getText(sf)))eligible=true;
    if(ts.isPropertyAssignment(p)&&/^(title|text|confirmButtonText|cancelButtonText)$/.test(p.name.getText(sf)))eligible=true;
    const value=n.head.text+n.templateSpans.map((span,i)=>`{value${i}}`+span.literal.text).join('');
    if(eligible&&/[a-zA-Z]{3}/.test(n.head.text+n.templateSpans.map(s=>s.literal.text).join(''))&&!/^(https?:|bg-|text-|\/)/.test(value))candidates.push({file:path.relative(root,file).replaceAll('\\','/'),start:n.getStart(sf),end:n.end,text:value,expressions:n.templateSpans.map(s=>s.expression.getText(sf))});
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);for(const e of edits.sort((a,b)=>b.s-a.s))text=text.slice(0,e.s)+e.v+text.slice(e.e);
 if(needT){const match=text.match(/import \{ ([^}]+) \} from '@\/components\/LanguageProvider';/);if(match){if(!match[1].split(',').map(s=>s.trim()).includes('T'))text=text.replace(match[0],`import { ${match[1]}, T } from '@/components/LanguageProvider';`);}else {const m=text.match(/^['"]use client['"];?\s*/);const i=m?m[0].length:0;text=text.slice(0,i)+"\nimport { T } from '@/components/LanguageProvider';\n"+text.slice(i);}}
 if(edits.length)fs.writeFileSync(file,text);
}
fs.writeFileSync(path.join(__dirname,'i18n-templates.json'),JSON.stringify(candidates,null,2));process.stdout.write(JSON.stringify({templates:candidates.length}));
