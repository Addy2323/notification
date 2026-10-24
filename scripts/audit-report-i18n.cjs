const fs=require('fs'),path=require('path'),ts=require('../node_modules/typescript');const base=path.resolve(__dirname,'../backend/src/services');const results=[];
for(const name of ['reportService.ts','adminReportService.ts']){const file=path.join(base,name),text=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);function visit(n){const p=n.parent;let yes=false;
if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateExpression(n)){
if(ts.isCallExpression(p)&&p.arguments[0]===n&&(/\.text$|\.addWorksheet$/.test(p.expression.getText(sf))||p.expression.getText(sf)==='table'))yes=true;
if(ts.isArrayLiteralExpression(p)&&ts.isCallExpression(p.parent)&&p.parent.expression.getText(sf)==='table')yes=true;
if(ts.isPropertyAssignment(p)&&['header','metric'].includes(p.name.getText(sf)))yes=true;
if(ts.isConditionalExpression(p)&&p.condition!==n&&ts.isStringLiteral(n)&&['Not recorded','Returned to stock','Cost retained'].includes(n.text))yes=true;
if(yes){const value=ts.isTemplateExpression(n)?n.head.text+n.templateSpans.map((s,i)=>`{value${i}}`+s.literal.text).join(''):n.text;if(/[A-Za-z]/.test(value))results.push({file:name,start:n.getStart(sf),end:n.end,text:value,expressions:ts.isTemplateExpression(n)?n.templateSpans.map(s=>s.expression.getText(sf)):[]});}}
ts.forEachChild(n,visit);}visit(sf);}
const strings=[...new Set(results.map(r=>r.text))];fs.writeFileSync(path.join(__dirname,'report-i18n.json'),JSON.stringify({entries:results,strings},null,2));strings.forEach((s,i)=>process.stdout.write(i+': '+s+'\n'));
