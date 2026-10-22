import express from 'express';
import mongoose from 'mongoose';
export function installLearning(router:express.Router,auth:any){
 const handle=(fn:any)=>async(req:any,res:any)=>{try{await fn(req,res);}catch{res.status(503).json({error:'Learning notes are temporarily unavailable. Your changes have not been saved.'});}};
 async function access(req:any){
  const course:any=await mongoose.model('Course').findOne({slug:req.params.slug,deleted:{$ne:true}}).lean()||await mongoose.model('Event').findOne({slug:req.params.slug,deleted:{$ne:true}}).lean();
  if(!course)return null;const u=req.user;
  const staff=['admin','superadmin'].includes(u.role)||String(course.createdBy)===String(u._id)||[...(course.instructors||[]),...(course.tas||[])].some((m:any)=>String(m.user)===String(u._id));
  if(!staff&&!await mongoose.model('Registration').exists({eventSlug:course.slug,email:{$in:u.emails?.length?u.emails:[u.email]},admissionStatus:'Confirmed',paymentStatus:'Confirmed'}))return null;
  return course;
 }
 const collection=()=>mongoose.connection.collection('learningProgress');
 router.get('/courses/:slug/access',auth,handle(async(req:any,res:any)=>{res.json({hasAccess:!!await access(req)});}));
 async function record(user:any,course:any){const _id=`${user._id}:${course._id}`;await collection().updateOne({_id:_id as any},{$setOnInsert:{userId:user._id,courseId:course._id,courseSlug:course.slug,__v:0,notes:{},completed:[],updatedAt:new Date()}},{upsert:true});return collection().findOne({_id:_id as any});}
 router.get('/courses/:slug/learning',auth,handle(async(req:any,res:any)=>{const course=await access(req);if(!course)return res.status(403).json({error:'Course access is required'});res.json({learning:await record(req.user,course)});}));
 router.patch('/courses/:slug/learning',auth,handle(async(req:any,res:any)=>{
  const course=await access(req);if(!course)return res.status(403).json({error:'Course access is required'});
  const {materialId,note,completed,__v}=req.body;
  const materials=(course.modulesList?.length?course.modulesList:course.eventDetails?.modulesList||[]).flatMap((m:any)=>m.materials||[]);
  if(typeof materialId!=='string'||!materials.some((m:any)=>String(m._id)===materialId)||!/^[-a-zA-Z0-9_]+$/.test(materialId)||note!==undefined&&(typeof note!=='string'||note.length>20000)||completed!==undefined&&typeof completed!=='boolean')return res.status(400).json({error:'Choose a valid material and keep notes below 20,000 characters'});
  if(!Number.isInteger(__v))return res.status(428).json({error:'Reload learning progress before saving. Your note remains in the editor.'});
  const previous:any=await record(req.user,course);if(previous.__v!==__v)return res.status(409).json({error:'Learning progress changed in another tab. Keep your note and reload before saving.'});
  const patch:any={updatedAt:new Date()};if(note!==undefined)patch[`notes.${materialId}`]=note;
  if(completed!==undefined)patch.completed=completed?[...new Set([...previous.completed,materialId])]:previous.completed.filter((id:string)=>id!==materialId);
  const next=await collection().findOneAndUpdate({_id:previous._id,__v},{$set:patch,$inc:{__v:1}},{returnDocument:'after'});
  if(!next)return res.status(409).json({error:'Another tab saved first. Your unsaved note remains in this editor.'});
  res.json({learning:next});
 }));
}
