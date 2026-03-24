import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useServers } from "@/hooks/useServer";
import { Telescope, Plus, ArrowRight } from "lucide-react";

interface ServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateServerDialog = ({ open, onOpenChange }: ServerDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { createServer, joinServer } = useServers();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Server name is required");
      return;
    }
    try {
      await createServer.mutateAsync({ name: name.trim(), description: description.trim() });
      toast.success(`Server "${name}" created!`);
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error("Invite code is required");
      return;
    }
    try {
      await joinServer.mutateAsync(inviteCode.trim());
      toast.success("Joined server!");
      setInviteCode("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl font-bold">
            Add a Server
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Create your own or join an existing one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4 space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Telescope className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Server Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary text-foreground"
                placeholder="My awesome server"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary text-foreground"
                placeholder="What's this server about?"
              />
            </div>
            <Button onClick={handleCreate} disabled={createServer.isPending} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {createServer.isPending ? "Creating..." : "Create Server"}
            </Button>
          </TabsContent>

          <TabsContent value="join" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Invite Code</Label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="bg-secondary text-foreground"
                placeholder="e.g. a1b2c3d4e5f6"
              />
            </div>
            <Button onClick={handleJoin} disabled={joinServer.isPending} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              {joinServer.isPending ? "Joining..." : "Join Server"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
