const ts=require('../node_modules/typescript'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../frontend'),files=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(f.endsWith('.tsx')&&!['LanguageProvider.tsx','LanguageSelector.tsx'].includes(e.name))files.push(f);}}walk(path.join(root,'app'));walk(path.join(root,'components'));
for(const file of files){let text=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const client=/['"]use client['"]/.test(text.slice(0,100));const edits=[];let wrapper=false,hook=false;
function visit(n){if(ts.isJsxExpression(n)&&n.expression&&!ts.isJsxAttribute(n.parent)){const ex=n.expression,raw=ex.getText(sf);let yes=false;
if(ts.isPropertyAccessExpression(ex)||ts.isPropertyAccessChain(ex))yes=['status','role','event_type','actor_type','recipient_type','payment_status'].includes(ex.name.text);
if(ts.isCallExpression(ex)&&/^(\w+\.)?(status|event_type)\.replaceAll\(/.test(raw))yes=true;
if(ts.isConditionalExpression(ex)&&/^\w+\.payment_status === 'REFUNDED'/.test(raw))yes=true;
if(ts.isPropertyAccessExpression(ex)&&ex.name.text==='description'&&/^(feat|feature|f|step|st|s|activeSlide|card|plan|p)$/.test(ex.expression.getText(sf)))yes=true;
if(ts.isIdentifier(ex)&&['status','metric'].includes(ex.text))yes=true;
if(file.endsWith(path.join('pricing','page.tsx'))&&raw==='p.name')yes=true;
if(file.endsWith('MobileBottomNav.tsx')&&raw==='item.name')yes=true;
if(yes){if(client&&text.includes('label: uiLabel'))edits.push({s:ex.getStart(sf),e:ex.end,v:`uiLabel(${raw})`});else{edits.push({s:n.getStart(sf),e:n.end,v:`<TLabel value={${raw}} />`});wrapper=true;}return;}}
ts.forEachChild(n,visit);}visit(sf);for(const e of edits.sort((a,b)=>b.s-a.s))text=text.slice(0,e.s)+e.v+text.slice(e.e);
if(wrapper){const match=text.match(/import \{ ([^}]+) \} from '@\/components\/LanguageProvider';/);if(match){if(!match[1].split(',').map(s=>s.trim()).includes('TLabel'))text=text.replace(match[0],`import { ${match[1]}, TLabel } from '@/components/LanguageProvider';`);}else{const m=text.match(/^['"]use client['"];?\s*/);const i=m?m[0].length:0;text=text.slice(0,i)+"\nimport { TLabel } from '@/components/LanguageProvider';\n"+text.slice(i);}}
if(edits.length)fs.writeFileSync(file,text);}
