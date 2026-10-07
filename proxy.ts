import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";

export function proxy(request:NextRequest){
 const protectedPath=request.nextUrl.pathname.startsWith("/dashboard")||request.nextUrl.pathname.startsWith("/companies")||request.nextUrl.pathname.startsWith("/tasks");
 if(!protectedPath)return NextResponse.next();
 if(request.cookies.get("fleur_session")?.value)return NextResponse.next();
 return NextResponse.redirect(new URL("/login",request.url));
}
export const config={matcher:["/dashboard/:path*","/companies/:path*","/tasks/:path*"]};
