"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/layout/locale-provider";
import { helpHref, searchHelp } from "@/lib/help";

export function HelpCenter() {
  const { t, locale } = useI18n();
  const { data } = useSession();
  const initial = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const articles = useMemo(() => searchHelp(query, locale), [query, locale]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.help.title}</h1>
        <p className="text-sm text-muted-foreground">{t.help.subtitle}</p>
      </div>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.help.searchPlaceholder}
          className="pl-9"
          autoFocus
        />
      </div>
      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.help.empty}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <CardTitle className="text-base">{article.title[locale]}</CardTitle>
                <CardDescription className="font-mono text-[11px] uppercase">{article.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{article.body[locale]}</p>
                <Link
                  href={helpHref(article, data?.user.role)}
                  className="text-sm text-primary hover:underline"
                >
                  {t.help.open}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
