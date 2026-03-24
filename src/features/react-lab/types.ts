export type LabRole = "admin" | "analista" | "operador";

export type LabUser = {
  id: string;
  name: string;
  email: string;
  role: LabRole;
  active: boolean;
};

export type CoworkTask = {
  id: string;
  title: string;
  owner: string;
  done: boolean;
  createdAt: string;
};

export type Experiment = {
  id: string;
  name: string;
  stage: "Ideación" | "Validación" | "MVP";
  owner: string;
};
