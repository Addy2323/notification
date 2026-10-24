const ts=require('../node_modules/typescript'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../frontend'),files=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(f.endsWith('.tsx')&&!['LanguageProvider.tsx','LanguageSelector.tsx'].includes(e.name))files.push(f);}}walk(path.join(root,'app'));walk(path.join(root,'components'));const results=[];
for(const file of files){const text=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function comp(n){while(n){if(ts.isFunctionDeclaration(n)&&n.name&&/^[A-Z]/.test(n.name.text))return n;n=n.parent;}return null;}
function context(n){let p=n.parent;while(p&&!ts.isStatement(p)){
if(ts.isJsxAttribute(p))return !['className','href','src','key','id','value','style','type','name','target','rel','method'].includes(p.name.getText(sf));
if(ts.isJsxExpression(p))return true;
if(ts.isCallExpression(p)&&/^(setError|setSuccess|setModalError|setErrorMsg|setErrorMessage|alert|window.confirm|onSaved|reject|resolve)$/.test(p.expression.getText(sf)))return true;
if(ts.isPropertyAssignment(p)&&/^(title|text|confirmButtonText|cancelButtonText|message)$/.test(p.name.getText(sf)))return true;
if(ts.isNewExpression(p)&&p.expression.getText(sf)==='Error')return true;
p=p.parent;}return false;}
function visit(n){
if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateExpression(n)){
 const value=ts.isTemplateExpression(n)?n.head.text+n.templateSpans.map((s,i)=>`{value${i}}`+s.literal.text).join(''):n.text;
 const compact=value.replace(/\s+/g,' ').trim();
 if(comp(n)&&context(n)&&/[a-zA-Z]{3}/.test(compact)&&!/^([a-z]+:|\/|#|bg-|text-|border-|flex|hidden|grid|font-|ring-|w-|h-|scale-|opacity-|animate-|[A-Z_]+$)/.test(compact)&&!/^((common|admin|merchant|public|auth|errors|status)\.)/.test(compact)&&!compact.includes('lumo_language'))results.push({file:path.relative(root,file).replaceAll('\\','/'),start:n.getStart(sf),end:n.end,text:value,template:ts.isTemplateExpression(n),expressions:ts.isTemplateExpression(n)?n.templateSpans.map(s=>s.expression.getText(sf)):[],attribute:ts.isJsxAttribute(n.parent)});
 }
 ts.forEachChild(n,visit);
}visit(sf);}
const unique=[...new Set(results.map(r=>r.text))];fs.writeFileSync(path.join(__dirname,'i18n-dynamic.json'),JSON.stringify({entries:results,strings:unique},null,2));unique.forEach((s,i)=>process.stdout.write(i+': '+s.replaceAll('\n','\\n')+'\n'));
