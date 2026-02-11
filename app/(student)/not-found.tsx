import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudentNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href={ROUTES.dashboard}>
            <Button>Back to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
