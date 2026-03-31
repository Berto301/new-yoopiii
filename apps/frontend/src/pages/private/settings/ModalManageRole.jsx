import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import CheckboxTree from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { PERMISSION_TREE } from "../../../helpers/constants.js";

const collectLeafValues = (nodes) =>
  nodes.flatMap((node) => (node.children?.length ? collectLeafValues(node.children) : [node.value]));

const LEAF_PERMISSION_VALUES = collectLeafValues(PERMISSION_TREE);

const treeIcons = {
  check: <span className="text-xs">[x]</span>,
  uncheck: <span className="text-xs">[ ]</span>,
  halfCheck: <span className="text-xs">[-]</span>,
  expandClose: <span className="text-xs">+</span>,
  expandOpen: <span className="text-xs">-</span>,
  expandAll: <span className="text-xs">+</span>,
  collapseAll: <span className="text-xs">-</span>,
  parentClose: <span className="text-xs">#</span>,
  parentOpen: <span className="text-xs">#</span>,
  leaf: <span className="text-xs">.</span>
};

export const ModalManageRole = ({ open, mode = "create", initialRole = null, onClose, onSubmit, isSaving = false }) => {
  const [expanded, setExpanded] = useState(PERMISSION_TREE.map((node) => node.value));
  const [checked, setChecked] = useState([]);
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      key: ""
    }
  });

  useEffect(() => {
    reset({
      name: initialRole?.name || "",
      key: initialRole?.key || ""
    });
    setChecked((initialRole?.permissions || []).filter((permission) => LEAF_PERMISSION_VALUES.includes(permission)));
  }, [initialRole, reset]);

  const title = mode === "edit" ? "Modification du role" : "Ajout role";

  const handleRoleSubmit = (values) =>
    onSubmit({
      ...values,
      permissions: checked.filter((permission) => LEAF_PERMISSION_VALUES.includes(permission))
    });

  return (
    <ModalLayout
      open={open}
      title={title}
      cancelLabel="Annuler"
      saveLabel={mode === "edit" ? "Enregistrer" : "Creer"}
      onClose={onClose}
      onSave={handleSubmit(handleRoleSubmit)}
      isSaving={isSaving}
      saveDisabled={!checked.length}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field }) => <Input label="Nom du role" placeholder="Manager ventes" {...field} />}
          />
          <Controller
            name="key"
            control={control}
            render={({ field }) => <Input label="Cle technique" placeholder="manager-ventes" {...field} />}
          />
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">Modules / Pages accessibles</p>
          <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-4 text-sm text-stone-200">
            <CheckboxTree
              nodes={PERMISSION_TREE}
              checked={checked}
              expanded={expanded}
              onCheck={(values) => setChecked(values.filter((value) => LEAF_PERMISSION_VALUES.includes(value)))}
              onExpand={setExpanded}
              icons={treeIcons}
              showNodeIcon={false}
            />
          </div>
        </div>
      </div>
    </ModalLayout>
  );
};

export default ModalManageRole;
