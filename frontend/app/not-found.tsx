import Link from "next/link";
import { Button } from "@/components/ui/button";
import { idiqlat } from "@/lib/utils";

export default function NotFound() {
    return (
        <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-24 text-center">

            <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
                <p
                    className={`${idiqlat.className} text-[64px] font-semibold leading-none md:text-[96px]`}
                >
                    404
                </p>
                <h1
                    className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}
                >
                    We couldn&apos;t find that page.
                </h1>
                <p className="max-w-xl text-base md:text-lg">
                    The link may be broken or the page may have moved. You can head
                    back home or start with one of the options below.
                </p>

                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <Button
                        render={<Link href="/" />}
                        nativeButton={false}
                        className="px-6 py-6 text-[15px] md:text-base"
                    >
                        Back to homepage
                    </Button>
                    <Button
                        render={<Link href="/symptoms" />}
                        nativeButton={false}
                        variant="outline"
                        className="px-6 py-6 text-[15px] md:text-base"
                    >
                        Describe my symptoms
                    </Button>
                </div>
            </div>
        </main>
    );
}