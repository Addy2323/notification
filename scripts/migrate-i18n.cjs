const fs=require('fs'),path=require('path'),ts=require('../node_modules/typescript');
const base=path.resolve(__dirname,'../frontend');
const audit=JSON.parse(fs.readFileSync(path.join(__dirname,'i18n-audit.json'),'utf8'));
const catalog=new Map();
for(const line of fs.readFileSync(path.join(__dirname,'sw-translations.tsv'),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)) { const m=line.match(/^(\d+)\t(.*)$/);if(m)catalog.set(audit[Number(m[1])].text,m[2]); }
const flatEn={},flatSw={},sourceKeys={};
function namespace(text) { const e=audit.find(row=>row.text===text); if(!e||e.files.length>2)return 'common';const file=e.files[0]; if(file.includes('(auth)'))return 'auth';if(file.includes('landing')||!file.includes('dashboard')&&!file.includes('admin'))return 'public';return file.includes('admin')?'admin':'merchant'; }
function add(text,sw,ns) { const slug=text.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,85)||'message';const prefix=ns||namespace(text);let key=prefix+'.'+slug;let i=2;while(flatEn[key]&&flatEn[key]!==text)key=prefix+'.'+slug+'_'+i++;flatEn[key]=text;flatSw[key]=sw;sourceKeys[text]=key;return key; }
for(const [en,sw]of catalog)add(en,sw);
add('Language','Lugha','common');add('Language saved on this device. Account preference could not be saved; please try again.','Lugha imehifadhiwa kwenye kifaa. Imeshindikana kuihifadhi kwenye akaunti; tafadhali jaribu tena.','common');
// Fixed public API keys used by the selector and error handling.
flatEn['common.preference_save_failed']='Language saved on this device. Account preference could not be saved; please try again.';flatSw['common.preference_save_failed']='Lugha imehifadhiwa kwenye kifaa. Imeshindikana kuihifadhi kwenye akaunti; tafadhali jaribu tena.';
const normalize=text=>text.replace(/\s+/g,' ').trim();
const attrs=new Set(['placeholder','title','alt','aria-label','message','description','label']);
const skipped=new Set(['LanguageProvider.tsx','LanguageSelector.tsx']);
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.tsx')&&!skipped.has(e.name)&&!p.endsWith(path.join('app','layout.tsx')))files.push(p);}}
walk(path.join(base,'app'));walk(path.join(base,'components'));
const changed=[];
for(const file of files){let text=fs.readFileSync(file,'utf8');const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const client=/['"]use client['"]/.test(text.slice(0,100));const edits=[];const hooks=new Set();let imports=new Set();
 function component(node){let current=node;while(current){if(ts.isFunctionDeclaration(current)&&current.name&&/^[A-Z]/.test(current.name.text))return current;if((ts.isArrowFunction(current)||ts.isFunctionExpression(current))&&ts.isVariableDeclaration(current.parent)&&/^[A-Z]/.test(current.parent.name.getText(source)))return current;current=current.parent;}return null;}
 function use(node){const c=component(node);if(!client||!c||!ts.isBlock(c.body))return false;hooks.add(c);imports.add('useLanguage');return true;}
 function replace(node,value){edits.push({start:node.getStart(source),end:node.end,value});}
 function literal(node){return ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node);}
 function visit(node){
  if(ts.isJsxText(node)){const value=normalize(node.text),key=sourceKeys[value];if(key){const before=/^\s/.test(node.text)?'{\' \'}':'';const after=/\s$/.test(node.text)?'{\' \'}':'';edits.push({start:node.pos,end:node.end,value:`${before}<T k=${JSON.stringify(key)} />${after}`});imports.add('T');}return;}
  if(literal(node)){
   const value=normalize(node.text),key=sourceKeys[value];const p=node.parent;
   if(key&&ts.isJsxAttribute(p)&&attrs.has(p.name.getText(source))&&use(node)){replace(node,`{t(${JSON.stringify(key)})}`);return;}
   if(key&&!( /^[A-Z_]+$/.test(value) )&&useEligible(node)){
     if(use(node)){replace(node,`t(${JSON.stringify(key)})`);return;}
   }
  }
  // Translate only known presentation fields, never product/customer record values.
  if(ts.isJsxExpression(node)&&node.expression){const expression=node.expression;let eligible=false;
    if(ts.isPropertyAccessExpression(expression)){
      const prop=expression.name.text,obj=expression.expression.getText(source);
      eligible=['label','title'].includes(prop)||prop==='description'&&/^(feature|f|step|plan|s)$/.test(obj);
      if(prop==='name'&&/^(item|link|nav)$/.test(obj)) { let ancestor=node;while(ancestor&&!ts.isSourceFile(ancestor)){if(ts.isCallExpression(ancestor)&&/navItems\.map|NAV_ITEMS\.map|navigation\.map/.test(ancestor.expression.getText(source)))eligible=true;ancestor=ancestor.parent;} }
    }
    if(ts.isIdentifier(expression)&&['title','label','note','header'].includes(expression.text))eligible=true;
    if(eligible){if(use(node)) replace(expression,`label(${expression.getText(source)})`);else {replace(node,`<TLabel value={${expression.getText(source)}} />`);imports.add('TLabel');}return;}
    if(literal(expression)&&sourceKeys[normalize(expression.text)]&&!client){replace(node,`<T k=${JSON.stringify(sourceKeys[normalize(expression.text)])} />`);imports.add('T');return;}
  }
  ts.forEachChild(node,visit);
 }
 function useEligible(node){const p=node.parent;
  if(ts.isJsxAttribute(p)||ts.isImportDeclaration(p)||ts.isExportDeclaration(p))return false;
  if(ts.isJsxExpression(p))return true;
  if(ts.isConditionalExpression(p)&&p.condition!==node)return true;
  if(ts.isBinaryExpression(p)&&p.operatorToken.kind===ts.SyntaxKind.BarBarToken&&p.right===node)return true;
  if(ts.isNewExpression(p)&&p.expression.getText(source)==='Error')return true;
  if(ts.isCallExpression(p)&&/^(setError|setSuccess|setModalError|setErrorMsg|setErrorMessage|alert|window.confirm|confirm)$/.test(p.expression.getText(source)))return true;
  if(ts.isPropertyAssignment(p)&&/^(title|text|confirmButtonText|cancelButtonText)$/.test(p.name.getText(source))) {let a=p;while(a&&!ts.isStatement(a)){if(ts.isCallExpression(a)&&/Swal.fire/.test(a.expression.getText(source)))return true;a=a.parent;}}
  return false;
 }
 visit(source);
 for(const c of hooks){if(c.body.getText(source).includes('const { t, label, locale } = useLanguage()'))continue;edits.push({start:c.body.getStart(source)+1,end:c.body.getStart(source)+1,value:'\n  const { t, label, locale } = useLanguage();\n'});}
 if(edits.length){
  // Keep outer replacements from overlapping replacements of their children.
  edits.sort((a,b)=>a.start-b.start||b.end-a.end);const filtered=[];let end=-1;for(const edit of edits){if(edit.start<end)continue;filtered.push(edit);end=edit.end;}
  for(const edit of filtered.reverse())text=text.slice(0,edit.start)+edit.value+text.slice(edit.end);
  const existing=text.match(/import \{ ([^}]+) \} from '@\/components\/LanguageProvider';/);
  if(existing){const names=new Set(existing[1].split(',').map(s=>s.trim()));for(const name of imports)names.add(name);text=text.replace(existing[0],`import { ${[...names].join(', ')} } from '@/components/LanguageProvider';`);}
  else {const match=text.match(/^['"]use client['"];?\s*/);const index=match?match[0].length:0;text=text.slice(0,index)+`\nimport { ${[...imports].join(', ')} } from '@/components/LanguageProvider';\n`+text.slice(index);}
  fs.writeFileSync(file,text);changed.push(path.relative(base,file));
 }
}
function nested(flat){const result={};for(const [key,value]of Object.entries(flat)){const [ns,name]=key.split('.');(result[ns]||={})[name]=value;}return result;}
fs.writeFileSync(path.join(base,'locales/en.json'),JSON.stringify(nested(flatEn),null,2)+'\n');fs.writeFileSync(path.join(base,'locales/sw.json'),JSON.stringify(nested(flatSw),null,2)+'\n');fs.writeFileSync(path.join(base,'locales/source-keys.json'),JSON.stringify(sourceKeys,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'i18n-migration-result.json'),JSON.stringify({files:changed,messages:Object.keys(flatEn).length},null,2));
process.stdout.write(JSON.stringify({files:changed.length,messages:Object.keys(flatEn).length}));
