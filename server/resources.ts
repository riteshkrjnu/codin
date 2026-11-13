import { suggestedCitation } from '../src/features/writing/articleMetadata';
import express from 'express';
import mongoose from 'mongoose';
import { categoryDefaults, mayEdit, mayManageSharing, validHttp, validateDocument } from './writingPolicy';
const resourceSchema=new mongoose.Schema({
 slug:{type:String,required:true,unique:true,match:/^[a-z0-9]+(?:-[a-z0-9]+)*$/},title:{type:String,required:true},kind:{type:String,enum:['Blog','White paper','Project report','Dataset','Model','Toolkit','Publication','Other'],default:'Publication'},
 description:String,body:String,url:String,image:String,authors:String,version:String,licence:String,citation:String,citationMode:{type:String,enum:['auto','custom']},articleDate:String,collaboratorIds:[mongoose.Schema.Types.ObjectId],
 mediaType:{type:String,enum:['note','photo','video','audio'],default:'note'},mediaUrl:String,transcript:String,
 document:mongoose.Schema.Types.Mixed,categories:[String],associatedEvents:[String],associatedCourses:[String],associatedProjects:[String],associatedCentres:[String],publishedAt:String,
 publicationState:{type:String,enum:['draft','published','archived'],default:'draft'},deleted:{type:Boolean,default:false},createdBy:mongoose.Schema.Types.ObjectId,updatedBy:mongoose.Schema.Types.ObjectId
},{timestamps:true});
export const Resource=mongoose.model('Resource',resourceSchema);
const Working=mongoose.model('ResourceWorking',new mongoose.Schema({resourceId:{type:mongoose.Schema.Types.ObjectId,unique:true},payload:mongoose.Schema.Types.Mixed,state:{type:String,enum:['draft','submitted','returned'],default:'draft'},feedback:String},{timestamps:true}));
const Settings=mongoose.model('EditorialSettings',new mongoose.Schema({key:{type:String,unique:true},value:mongoose.Schema.Types.Mixed},{timestamps:true}));
const fields=['slug','title','kind','description','body','url','image','authors','version','licence','citation','citationMode','articleDate','mediaType','mediaUrl','transcript','document','categories','associatedEvents','associatedCourses','associatedProjects','associatedCentres','publishedAt'];
export function resourcePatch(body:any){
 const value:any=Object.fromEntries(fields.filter(k=>body[k]!==undefined).map(k=>[k,body[k]]));
 const listFields=['categories','associatedEvents','associatedCourses','associatedProjects','associatedCentres'];
 for(const key of fields.filter(k=>k!=='document'&&!listFields.includes(k)))if(value[key]!==undefined&&(typeof value[key]!=='string'||value[key].length>(key==='body'?1000000:100000)))throw new Error('Invalid resource text');
 if(value.slug!==undefined&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug))throw new Error('Invalid public URL slug');
 if(value.kind!==undefined&&!['Blog','White paper','Project report','Dataset','Model','Toolkit','Publication','Other'].includes(value.kind))throw new Error('Invalid resource format');
 if(value.mediaType!==undefined&&!['note','photo','video','audio'].includes(value.mediaType))throw new Error('Invalid media format');

 for(const key of ['url','image','mediaUrl'])if(value[key]&&!validHttp(value[key]))throw new Error('Use complete HTTP(S) URLs');
 if(value.publishedAt&&!Number.isFinite(Date.parse(value.publishedAt)))throw new Error('Invalid publication date');
 if(value.publishedAt)value.publishedAt=new Date(value.publishedAt).toISOString();
 if(value.document)value.document=validateDocument(value.document);
 for(const key of ['categories','associatedEvents','associatedCourses','associatedProjects','associatedCentres'])if(value[key]&&(!Array.isArray(value[key])||value[key].length>300||value[key].some((v:any)=>typeof v!=='string'||v.length>200)))throw new Error('Invalid content connections');
 if(value.citationMode!==undefined&&!['auto','custom'].includes(value.citationMode))throw new Error('Invalid citation mode');
 if(value.articleDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(value.articleDate)||!Number.isFinite(Date.parse(value.articleDate))||new Date(value.articleDate).toISOString().slice(0,10)!==value.articleDate))throw new Error('Invalid article date');
 if(value.title!==undefined&&(typeof value.title!=='string'||!value.title.trim()))throw new Error('A title is required');
 return value;
}
const publicQuery=()=>({publicationState:'published' as const,deleted:{$ne:true},$or:[{publishedAt:{$lte:new Date().toISOString()}},{publishedAt:{$in:[null,'']}}]});
export function installResources(router:express.Router,auth:any){
 router.use(['/writing','/admin/resources'],(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 let indexes:Promise<any>|undefined;
 const ensureIndexes=()=>indexes??=Promise.all([Resource.collection.createIndex({slug:1},{unique:true}),Working.collection.createIndex({resourceId:1},{unique:true}),Settings.collection.createIndex({key:1},{unique:true})]).catch(error=>{indexes=undefined;throw error;});
 const admin=(req:any,res:any,next:any)=>['admin','superadmin'].includes(req.user?.role)?next():res.status(403).json({error:'Administrator access required'});
 const handle=(fn:any)=>async(req:any,res:any)=>{try{await fn(req,res);}catch(e:any){res.status(e.code===11000?409:e.name==='ValidationError'||e.message?.startsWith('Invalid')||/required|URL|YouTube|gallery|document|block/.test(e.message)?400:503).json({error:e.code===11000?'This URL slug is already in use.':e.name==='ValidationError'?'Check the required fields.':e.message||'Your changes could not be saved.'});}};
 const validateCategories=async(payload:any)=>{const allowed:any=(await Settings.findOne({key:'categories'}).lean())?.value??categoryDefaults;if(payload.categories?.some((c:string)=>!allowed.includes(c)))throw new Error('Invalid content category');};
 const settings=async(key:string,fallback:any)=>(await Settings.findOne({key}).lean())?.value??fallback;
 router.get('/resource-categories',handle(async(_req:any,res:any)=>res.json({categories:await settings('categories',categoryDefaults)})));
 router.put('/admin/resource-categories',auth,admin,handle(async(req:any,res:any)=>{await ensureIndexes();const categories=req.body.categories;if(!Array.isArray(categories)||!categories.length||categories.some((c:any)=>typeof c!=='string'||!c.trim()||c.length>80))return res.status(400).json({error:'Provide category names.'});await Settings.findOneAndUpdate({key:'categories'},{$set:{value:[...new Set(categories)]}},{upsert:true});res.json({categories});}));
 router.get('/homepage-curation',handle(async(_req:any,res:any)=>res.json({tiles:await settings('homepage',{})})));
 router.put('/admin/homepage-curation',auth,admin,handle(async(req:any,res:any)=>{await ensureIndexes();const tiles=req.body.tiles;if(!tiles||typeof tiles!=='object'||Array.isArray(tiles)||Object.entries(tiles).some(([key,ids])=>!['projects','w2m','events','notices','publications','upcoming','showcase'].includes(key)||!Array.isArray(ids)||ids.length>50||ids.some(id=>typeof id!=='string')))return res.status(400).json({error:'Invalid tile selections'});await Settings.findOneAndUpdate({key:'homepage'},{$set:{value:tiles}},{upsert:true});res.json({tiles});}));
 router.get('/resources',handle(async(_req:any,res:any)=>res.json({resources:await Resource.find(publicQuery()).select('-createdBy -updatedBy -__v -collaboratorIds').sort({publishedAt:-1,createdAt:-1}).lean()})));
 async function editableList(req:any,res:any){const resources:any[]=await Resource.find(['admin','superadmin'].includes(req.user.role)?{}:{$or:[{createdBy:req.user._id},{collaboratorIds:req.user._id}]}).sort({updatedAt:-1}).lean();const working:any[]=await Working.find({resourceId:{$in:resources.map(r=>r._id)}}).lean();res.json({resources:resources.map(r=>{const w=working.find(w=>String(w.resourceId)===String(r._id));return {...r,...w?.payload,slug:r.slug,canManageSharing:mayManageSharing(req.user,r),reviewState:w?.state||r.publicationState,feedback:w?.feedback||'',__v:r.__v};})});}
 router.get('/writing',auth,handle(editableList));router.get('/admin/resources',auth,admin,handle(editableList));
 router.get('/writing/:slug/preview',auth,handle(async(req:any,res:any)=>{const r:any=await Resource.findOne({slug:req.params.slug}).lean();if(!r||!mayEdit(req.user,r))return res.status(404).json({error:'Draft not found'});const w:any=await Working.findOne({resourceId:r._id}).lean();res.json({resource:{...r,...w?.payload,canManageSharing:mayManageSharing(req.user,r),reviewState:w?.state,feedback:w?.feedback}});}));


 router.get('/writing/:slug/collaborators',auth,handle(async(req:any,res:any)=>{
  const record:any=await Resource.findOne({slug:req.params.slug}).lean();if(!record||!mayEdit(req.user,record))return res.status(404).json({error:'Article not found'});
  const manage=mayManageSharing(req.user,record);const users=await mongoose.model('User').find({_id:{$in:record.collaboratorIds||[]}}).select(manage?'name email':'name').lean();
  res.json({collaborators:users.map((u:any)=>({id:String(u._id),name:u.name||'CoDIN member',...(manage?{email:u.email}:{})})),canManage:manage,__v:record.__v});
 }));
 const changeSharing=(remove:boolean)=>handle(async(req:any,res:any)=>{
  await ensureIndexes();const record:any=await Resource.findOne({slug:req.params.slug}).lean();if(!record||!mayEdit(req.user,record))return res.status(404).json({error:'Article not found'});
  if(!mayManageSharing(req.user,record))return res.status(403).json({error:'Only the owner or an administrator can change sharing.'});
  if(!Number.isInteger(req.body.__v))return res.status(428).json({error:'A revision is required. Reload sharing before changing access.'});
  let target:any;
  if(remove){if(!mongoose.isValidObjectId(req.params.userId))return res.status(400).json({error:'Invalid collaborator'});target={_id:new mongoose.Types.ObjectId(req.params.userId)};}
  else {const email=String(req.body.email||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Enter the email address of an existing account.'});
   target=await mongoose.model('User').findOne({$or:[{email:email.toLowerCase()},{emails:email.toLowerCase()}]}).collation({locale:'en',strength:2}).select('_id').lean();if(!target)return res.status(404).json({error:'No account found for that email. Ask the person to create an account first.'});
   if(String(target._id)===String(record.createdBy))return res.status(400).json({error:'The owner already has editing access.'});}
  let updated:any;await mongoose.connection.transaction(async session=>{
   const current:any=await Resource.findOne({_id:record._id,__v:req.body.__v}).session(session).lean();if(!current)return;
   const working=await Working.findOne({resourceId:record._id}).session(session).lean();await mongoose.connection.collection('contentRevisions').insertOne({collection:'resources',recordId:record._id,revision:current.__v,snapshot:current,workingSnapshot:working,actorId:req.user._id,action:remove?'sharing-remove':'sharing-add',createdAt:new Date()},{session});
   updated=await Resource.findOneAndUpdate({_id:record._id,__v:req.body.__v},{[remove?'$pull':'$addToSet']:{collaboratorIds:target._id},$inc:{__v:1},$set:{updatedBy:req.user._id}},{new:true,session});
  });if(!updated)return res.status(409).json({error:'This article changed. Reload sharing before trying again.'});res.json({__v:updated.__v});
 });
 router.post('/writing/:slug/collaborators',auth,changeSharing(false));
 router.delete('/writing/:slug/collaborators/:userId',auth,changeSharing(true));
 router.get('/writing/:slug/revisions',auth,handle(async(req:any,res:any)=>{const r:any=await Resource.findOne({slug:req.params.slug}).lean();if(!r||!mayEdit(req.user,r))return res.status(404).json({error:'Draft not found'});const revisions=await mongoose.connection.collection('contentRevisions').find({collection:'resources',recordId:r._id}).project({snapshot:0,workingSnapshot:0,actorId:0}).sort({revision:-1}).toArray();res.json({revisions});}));
 router.post('/writing/:slug/restore/:revision',auth,handle(async(req:any,res:any)=>{
  await ensureIndexes();
  const r:any=await Resource.findOne({slug:req.params.slug}).lean();if(!r||!mayEdit(req.user,r))return res.status(404).json({error:'Draft not found'});
  if(!Number.isInteger(req.body.__v))return res.status(428).json({error:'A revision is required.'});
  const revision=await mongoose.connection.collection('contentRevisions').findOne({collection:'resources',recordId:r._id,revision:Number(req.params.revision)});if(!revision)return res.status(404).json({error:'Revision not found'});
  let saved:any;await mongoose.connection.transaction(async session=>{const current:any=await Resource.findOne({_id:r._id,__v:req.body.__v}).session(session).lean();if(!current)return;const working=await Working.findOne({resourceId:r._id}).session(session).lean();await mongoose.connection.collection('contentRevisions').insertOne({collection:'resources',recordId:r._id,revision:current.__v,snapshot:current,workingSnapshot:working,actorId:req.user._id,action:'restore-revision',createdAt:new Date()},{session});await Working.findOneAndUpdate({resourceId:r._id},{$set:{payload:resourcePatch(revision.workingSnapshot?.payload||revision.snapshot),state:'draft',feedback:''}},{upsert:true,session});saved=await Resource.findOneAndUpdate({_id:r._id,__v:req.body.__v},{$inc:{__v:1},$set:{updatedBy:req.user._id}},{new:true,session});});if(!saved)return res.status(409).json({error:'This resource changed. Reload before restoring.'});res.json({resource:saved});
 }));
 router.get('/resources/:slug',handle(async(req:any,res:any)=>{const resource=await Resource.findOne({...publicQuery(),slug:req.params.slug}).select('-createdBy -updatedBy -__v -collaboratorIds').lean();if(!resource)return res.status(404).json({error:'Resource not found'});res.json({resource});}));
 router.post('/resources',auth,handle(async(req:any,res:any)=>{
  const payload=resourcePatch(req.body);if(!payload.authors)payload.authors=req.user.name||req.user.email||'';payload.citationMode??=payload.citation?'custom':'auto';if(payload.citationMode==='auto')payload.citation=suggestedCitation({...payload,createdAt:new Date().toISOString()},process.env.APP_URL||'http://localhost:3000');const isAdmin=['admin','superadmin'].includes(req.user.role),action=req.body.action||(req.body.publicationState==='draft'?'draft':req.body.publicationState==='archived'?'archive':isAdmin?'publish':'draft');
  if(!['draft','submit','publish'].includes(action))return res.status(400).json({error:'Invalid creation action'});
  if(!isAdmin&&action==='publish')return res.status(403).json({error:'Submit your work for administrator review.'});
  await ensureIndexes();
  await validateCategories(payload);
  let resource:any;await mongoose.connection.transaction(async session=>{resource=await Resource.create([{...payload,authors:payload.authors||req.user.name||'',publicationState:action==='publish'?'published':'draft',publishedAt:action==='publish'?(payload.publishedAt||new Date().toISOString()):payload.publishedAt,createdBy:req.user._id,updatedBy:req.user._id}],{session}).then(rows=>rows[0]);if(action!=='publish')await Working.create([{resourceId:resource._id,payload,state:action==='submit'?'submitted':'draft'}],{session});});res.status(201).json({resource});
 }));
 router.patch('/resources/:slug',auth,handle(async(req:any,res:any)=>{
  await ensureIndexes();
  if(!Number.isInteger(req.body.__v))return res.status(428).json({error:'A revision is required. Reload before saving.'});
  const before:any=await Resource.findOne({slug:req.params.slug}).lean();if(!before||!mayEdit(req.user,before))return res.status(404).json({error:'Draft not found'});
  const isAdmin=['admin','superadmin'].includes(req.user.role),action=req.body.action||(req.body.publicationState==='draft'?'draft':req.body.publicationState==='archived'?'archive':isAdmin?'publish':'draft');
  if(!['draft','submit','publish','approve','return','archive','restore'].includes(action))return res.status(400).json({error:'Unknown editorial action'});
  if(['publish','approve','return','archive','restore'].includes(action)&&!isAdmin)return res.status(403).json({error:'Administrator review is required.'});
  await validateCategories(resourcePatch(req.body));
  let resource:any,invalid=false;
  await mongoose.connection.transaction(async session=>{
   const current:any=await Resource.findOne({_id:before._id,__v:req.body.__v}).session(session).lean();if(!current)return;
   const working:any=await Working.findOne({resourceId:current._id}).session(session).lean();
   if(['approve','return'].includes(action)&&working?.state!=='submitted'){invalid=true;return;}
   const payload={...Object.fromEntries(fields.filter(k=>current[k]!==undefined).map(k=>[k,current[k]])),...working?.payload,...resourcePatch(req.body),slug:current.slug};
   payload.citationMode??=payload.citation?'custom':'auto';if(payload.citationMode==='auto')payload.citation=suggestedCitation({...payload,createdAt:current.createdAt},process.env.APP_URL||'http://localhost:3000');
   await mongoose.connection.collection('contentRevisions').insertOne({collection:'resources',recordId:current._id,revision:current.__v,snapshot:current,workingSnapshot:working,actorId:req.user._id,action,createdAt:new Date()},{session});
   let change:any={updatedBy:req.user._id};
   if(isAdmin&&typeof req.body.deleted==='boolean')change.deleted=req.body.deleted;
   if(['publish','approve'].includes(action)){change={...change,...payload,publicationState:'published',publishedAt:payload.publishedAt||new Date().toISOString(),deleted:typeof req.body.deleted==='boolean'?req.body.deleted:false};await Working.deleteOne({resourceId:current._id},{session});}
   else if(action==='archive'||action==='restore')change.publicationState=action==='archive'?'archived':'draft';
   else await Working.findOneAndUpdate({resourceId:current._id},{$set:{payload,state:action==='submit'?'submitted':action==='return'?'returned':'draft',feedback:action==='return'?String(req.body.feedback||''):working?.feedback||''}},{upsert:true,session});
   resource=await Resource.findOneAndUpdate({_id:current._id,__v:req.body.__v},{$set:change,$inc:{__v:1}},{new:true,runValidators:true,session});
  });
  if(invalid)return res.status(400).json({error:'Only submitted work can be reviewed.'});
  if(!resource)return res.status(409).json({error:'This resource changed in another editor. Your unsaved work remains here.'});res.json({resource});
 }));
}
