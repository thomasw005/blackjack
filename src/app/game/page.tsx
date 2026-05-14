import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/auth";

export default async function GamePage() {
    const user = await getUser();

    return (
        <main>
            <h1>Game</h1>
            {user ? (
                <>
                    <p>Logged in as: {user.email}</p>
                    <form action={signOut}>
                        <button type="submit">Sign out</button>
                    </form>
                </>
            ) : (
                <p>Not logged in</p>
            )}
        </main>
    );
}
