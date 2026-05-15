import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propaga cookies no request primeiro
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Reconstrói o response com o request atualizado
          supabaseResponse = NextResponse.next({ request });
          // Copia todos os cookies para o response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: não encadear chamadas entre getUser() e o redirect,
  // pois o session token precisa ser validado antes de qualquer lógica.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/redefinir-senha" ||
    pathname.startsWith("/api/");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Rotas acessíveis apenas a admin
  const isAdminRoute =
    pathname.startsWith("/configuracoes") &&
    pathname !== "/configuracoes/conta" &&
    !pathname.startsWith("/configuracoes/conta");

  if (user && isAdminRoute && user.app_metadata?.papel !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/kanban";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
