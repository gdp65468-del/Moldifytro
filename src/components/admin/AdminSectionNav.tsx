import { NavLink } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";

const links = [
  { to: "/admin", label: "Visao geral" },
  { to: "/admin/templates", label: "Templates" },
  { to: "/admin/payments", label: "Pagamentos" },
  { to: "/admin/users", label: "Usuarios" },
  { to: "/admin/platform", label: "Plataforma" },
];

export function AdminSectionNav() {
  return (
    <Panel className="p-3">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/admin"}
            className={({ isActive }) =>
              [
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-ink text-white"
                  : "border border-stone-300 bg-white text-stone-700 hover:border-ember hover:text-ember",
              ].join(" ")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </Panel>
  );
}
