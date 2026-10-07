import type {Metadata} from "next";

// The page is a client component; the title has to come from a server layout.
export const metadata: Metadata = {title: "Sign in"};

export default function SignInLayout({children}: LayoutProps<"/sign-in">) {
    return children;
}
