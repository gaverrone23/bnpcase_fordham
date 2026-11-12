import React,{useState} from "react";
import { ShieldCheck, LockKeyhole, ArrowRight, Info } from "lucide-react";

export function WorkspaceLogin({onSignIn}:{onSignIn:()=>void}){
  const [user,setUser]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  function submit(e:React.FormEvent){
    e.preventDefault();
    if(user.trim()==="12345" && password==="12345"){
      setError("");onSignIn();
    }else{setError("Incorrect User ID or password. Use the credentials shown below for this prototype.");}
  }
  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5 font-sans text-slate-900">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-emerald-950 px-8 py-8 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 font-bold">CS</span>
          <div><h1 className="text-2xl font-bold">Client Signals</h1><p className="text-sm text-emerald-100">Corporate Banking · Relationship Intelligence</p></div>
        </div>
      </div>
      <form onSubmit={submit} className="p-8 space-y-5">
        <div><h2 className="font-semibold text-lg">Sign in to your workspace</h2><p className="text-sm text-slate-500 mt-1">Access your relationship portfolio and client signals.</p></div>
        <label className="block text-sm font-semibold">User ID
          <input autoComplete="username" value={user} onChange={e=>setUser(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-emerald-700" placeholder="Enter user ID" required/>
        </label>
        <label className="block text-sm font-semibold">Password
          <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-emerald-700" placeholder="Enter password" required/>
        </label>
        {error&&<p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</p>}
        <button className="w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 flex gap-2 justify-center items-center">Sign in <ArrowRight size={16}/></button>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="font-semibold flex items-center gap-2"><Info size={15}/> Prototype access</p>
          <p className="mt-2">User ID: <strong className="font-mono">12345</strong> · Password: <strong className="font-mono">12345</strong></p>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 flex gap-2"><ShieldCheck size={17} className="shrink-0"/>This is a demonstration using fictional client data. Sign-in and role permissions are illustrative, not bank authentication. Production access would rely on approved identity, information-barrier and privacy controls.</p>
      </form>
    </div>
  </main>;
}