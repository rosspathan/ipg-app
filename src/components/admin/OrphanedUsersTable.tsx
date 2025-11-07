import { formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OrphanedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface OrphanedUsersTableProps {
  users: OrphanedUser[];
}

export function OrphanedUsersTable({ users }: OrphanedUsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orphaned users found
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Sign In</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono text-sm">{user.email}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {user.last_sign_in_at 
                  ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                  : "Never"
                }
              </TableCell>
              <TableCell>
                <Badge variant="destructive">Orphaned</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
