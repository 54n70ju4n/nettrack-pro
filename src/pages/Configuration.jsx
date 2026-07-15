import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HardHat, Building2 } from "lucide-react";
import UsersSection from "@/components/config/UsersSection";
import TechniciansSection from "@/components/config/TechniciansSection";
import ProjectInfoSection from "@/components/config/ProjectInfoSection";

export default function Configuration() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra usuarios, técnicos e información del proyecto</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="techs" className="gap-1.5">
            <HardHat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Técnicos</span>
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Proyecto</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-5">
          <UsersSection />
        </TabsContent>
        <TabsContent value="techs" className="mt-5">
          <TechniciansSection />
        </TabsContent>
        <TabsContent value="project" className="mt-5">
          <ProjectInfoSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}