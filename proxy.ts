import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";

const protectedPrefixes=["/dashboard","/companies","/tasks","/leads","/admin"];
const apiPrefixes=["/api"];

export function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;
 const protectedPath=protectedPrefixes.some(prefix=>path===prefix||path.startsWith(prefix+"/"));
 const apiPath=apiPrefixes.some(prefix=>path===prefix||path.startsWith(prefix+"/"));
 if(!protectedPath&&!apiPath)return NextResponse.next();
 const session=request.cookies.get("fleur_session")?.value;
 if(session)return NextResponse.next();
 if(apiPath)return NextResponse.json({error:"UNAUTHENTICATED"},{status:401});
 return NextResponse.redirect(new URL("/login",request.url));
}
export const config={matcher:["/dashboard/:path*","/companies/:path*","/tasks/:path*","/leads/:path*","/admin/:path*","/api/:path*"]};