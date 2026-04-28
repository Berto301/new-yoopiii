import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { createNotifications } from "../notifications/notifications.service.js";
import { OwnerMaintenanceTicket } from "../owner/models/owner-maintenance-ticket.model.js";
import { Property } from "../properties/property.model.js";
import { OwnerExpense } from "./expense.model.js";

const ASSET_CATEGORIES = new Set(["rent_income", "sale_price", "property_income"]);
const LIABILITY_CATEGORIES = new Set(["maintenance", "administrative", "commission", "other_charge"]);

const formatCurrency = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString("fr-FR")} ${currency}`;

const normalizeExpenseType = (type) => {
  if (type === "asset") {
    return "actif";
  }

  if (type === "liability") {
    return "passif";
  }

  return type;
};

const resolveExpenseType = ({ category, type }) => {
  if (ASSET_CATEGORIES.has(category)) {
    return "actif";
  }

  if (LIABILITY_CATEGORIES.has(category)) {
    return "passif";
  }

  return normalizeExpenseType(type) || "passif";
};

const resolveDateFilter = ({ year, month }) => {
  if (!year) {
    return null;
  }

  if (month) {
    return {
      $gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)),
      $lt: month === 12
        ? new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0))
        : new Date(Date.UTC(year, month, 1, 0, 0, 0))
    };
  }

  return {
    $gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    $lt: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0))
  };
};

const buildExpenseQuery = ({ ownerId, filters = {} }) => {
  const query = { ownerId };
  const dateFilter = resolveDateFilter(filters);
  const type = normalizeExpenseType(filters.type);

  if (dateFilter) {
    query.expenseDate = dateFilter;
  }

  if (filters.propertyId) {
    query.propertyId = filters.propertyId;
  }

  if (type) {
    query.type = type;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  return query;
};

const ensureOwnerProperty = async ({ ownerId, propertyId }) => {
  if (!propertyId) {
    return null;
  }

  const property = await Property.findOne({ _id: propertyId, ownerUserId: ownerId })
    .select("title currency ownerUserId")
    .lean();

  if (!property) {
    throw new AppError("Bien introuvable pour ce proprietaire", StatusCodes.NOT_FOUND);
  }

  return property;
};

const resolveExpensePropertyLabel = (expense) =>
  expense.propertyId?.title ||
  expense.propertyLabel ||
  "Portefeuille";

const mapOwnerExpense = (expense) => ({
  id: String(expense._id),
  ownerId: String(expense.ownerId),
  propertyId: expense.propertyId?._id ? String(expense.propertyId._id) : expense.propertyId ? String(expense.propertyId) : null,
  propertyLabel: resolveExpensePropertyLabel(expense),
  label: expense.label,
  description: expense.description || "",
  type: expense.type,
  category: expense.category,
  amount: Number(expense.amount || 0),
  currency: expense.currency || "USD",
  expenseDate: expense.expenseDate,
  budgetAmount: Number(expense.budgetAmount || 0),
  isBudgetExceeded: Number(expense.budgetAmount || 0) > 0 && Number(expense.amount || 0) > Number(expense.budgetAmount || 0),
  source: expense.source || "manual",
  sourceRefId: expense.sourceRefId ? String(expense.sourceRefId) : null,
  sourceMeta: expense.sourceMeta || {},
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt
});

const buildExpenseSummary = (expenses) => {
  const summary = expenses.reduce(
    (currentSummary, expense) => {
      const amount = Number(expense.amount || 0);
      const bucket = expense.type === "actif" ? "totalIncome" : "totalExpenses";

      currentSummary[bucket] += amount;
      currentSummary.count += 1;

      if (expense.type === "actif") {
        currentSummary.incomeCount += 1;
      } else {
        currentSummary.expenseCount += 1;
      }

      if (Number(expense.budgetAmount || 0) > 0 && amount > Number(expense.budgetAmount || 0)) {
        currentSummary.budgetExceededCount += 1;
      }

      const categoryKey = expense.category;
      const categoryEntry = currentSummary.categoryMap.get(categoryKey) || {
        category: categoryKey,
        type: expense.type,
        total: 0,
        count: 0
      };

      categoryEntry.total += amount;
      categoryEntry.count += 1;
      currentSummary.categoryMap.set(categoryKey, categoryEntry);

      return currentSummary;
    },
    {
      totalIncome: 0,
      totalExpenses: 0,
      incomeCount: 0,
      expenseCount: 0,
      budgetExceededCount: 0,
      count: 0,
      categoryMap: new Map()
    }
  );

  return {
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    netBalance: summary.totalIncome - summary.totalExpenses,
    incomeCount: summary.incomeCount,
    expenseCount: summary.expenseCount,
    budgetExceededCount: summary.budgetExceededCount,
    count: summary.count,
    categoryBreakdown: [...summary.categoryMap.values()].sort((left, right) => right.total - left.total)
  };
};

const hydrateExpense = (query) =>
  query
    .populate("propertyId", "title currency purpose")
    .lean();

const buildExpenseNotification = ({ ownerId, type, title, body, expense }) => ({
  userId: ownerId,
  type,
  title,
  body,
  channel: "in_app",
  data: {
    expenseId: String(expense._id || expense.id),
    propertyId: expense.propertyId?._id ? String(expense.propertyId._id) : expense.propertyId ? String(expense.propertyId) : null,
    amount: Number(expense.amount || 0),
    type: expense.type,
    category: expense.category
  }
});

const createExpenseNotification = async ({ ownerId, action, expense }) => {
  const propertyLabel = resolveExpensePropertyLabel(expense);
  const actionMap = {
    created: {
      type: "owner.expense.created",
      title: `Mouvement ajoute: ${expense.label}`,
      body: `${expense.label} a ete ajoute pour ${propertyLabel} (${formatCurrency(expense.amount, expense.currency)}).`
    },
    updated: {
      type: "owner.expense.updated",
      title: `Mouvement mis a jour: ${expense.label}`,
      body: `${expense.label} a ete mis a jour pour ${propertyLabel} (${formatCurrency(expense.amount, expense.currency)}).`
    },
    deleted: {
      type: "owner.expense.deleted",
      title: `Mouvement supprime: ${expense.label}`,
      body: `${expense.label} a ete supprime du suivi financier de ${propertyLabel}.`
    }
  };

  const notification = actionMap[action];

  if (!notification) {
    return;
  }

  await createNotifications([
    buildExpenseNotification({
      ownerId,
      ...notification,
      expense
    })
  ]);
};

const createBudgetNotification = async ({ ownerId, expense }) => {
  const amount = Number(expense.amount || 0);
  const budgetAmount = Number(expense.budgetAmount || 0);

  if (!budgetAmount || amount <= budgetAmount) {
    return;
  }

  await createNotifications([
    buildExpenseNotification({
      ownerId,
      type: "owner.expense.budget_exceeded",
      title: `Budget depasse: ${expense.label}`,
      body: `${expense.label} depasse le budget prevu (${formatCurrency(amount, expense.currency)} / ${formatCurrency(budgetAmount, expense.currency)}).`,
      expense
    })
  ]);
};

const syncMaintenanceExpenses = async ({ ownerId }) => {
  const tickets = await OwnerMaintenanceTicket.find({ ownerId })
    .populate("managedPropertyId", "title currency")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const ticketIds = tickets.map((ticket) => ticket._id);

  await OwnerExpense.deleteMany({
    ownerId,
    source: "maintenance",
    ...(ticketIds.length ? { sourceRefId: { $nin: ticketIds } } : {})
  });

  await Promise.all(
    tickets.map((ticket) => {
      const managedPropertyId = ticket.managedPropertyId?._id || ticket.managedPropertyId || null;
      const propertyLabel = ticket.managedPropertyId?.title || ticket.propertyLabel || "Bien non renseigne";
      const maintenanceAmount = Number(ticket.maintenanceAmount || 0);
      const maintenanceCurrency = ticket.currency || ticket.managedPropertyId?.currency || "USD";

      return OwnerExpense.findOneAndUpdate(
        {
          ownerId,
          source: "maintenance",
          sourceRefId: ticket._id
        },
        {
          $set: {
            ownerId,
            propertyId: managedPropertyId,
            propertyLabel,
            label: `Maintenance - ${ticket.title}`,
            description: ticket.description || "",
            type: "passif",
            category: "maintenance",
            amount: maintenanceAmount,
            currency: maintenanceCurrency,
            expenseDate: ticket.lastUpdateAt || ticket.updatedAt || ticket.createdAt,
            source: "maintenance",
            sourceRefId: ticket._id,
            sourceMeta: {
              ticketStatus: ticket.status,
              priority: ticket.priority,
              assignee: ticket.assignee || "",
              maintenanceAmount,
              currency: maintenanceCurrency
            },
            updatedBy: ownerId
          },
          $setOnInsert: {
            budgetAmount: 0,
            createdBy: ownerId
          }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    })
  );
};

export const listOwnerExpenses = async ({ ownerId, filters = {} }) => {
  await syncMaintenanceExpenses({ ownerId });

  const expenses = await hydrateExpense(
    OwnerExpense.find(buildExpenseQuery({ ownerId, filters })).sort({ expenseDate: -1, updatedAt: -1 })
  );

  return {
    items: expenses.map(mapOwnerExpense),
    summary: buildExpenseSummary(expenses)
  };
};

export const getOwnerExpenseById = async ({ ownerId, expenseId }) => {
  await syncMaintenanceExpenses({ ownerId });

  const expense = await hydrateExpense(OwnerExpense.findOne({ _id: expenseId, ownerId }));

  if (!expense) {
    throw new AppError("Mouvement financier introuvable", StatusCodes.NOT_FOUND);
  }

  return mapOwnerExpense(expense);
};

export const createOwnerExpense = async ({ ownerId, actorUserId, payload }) => {
  const property = await ensureOwnerProperty({
    ownerId,
    propertyId: payload.propertyId
  });

  const expense = await OwnerExpense.create({
    ownerId,
    propertyId: property?._id || null,
    propertyLabel: property?.title || payload.propertyLabel || "Portefeuille",
    label: payload.label,
    description: payload.description || "",
    type: resolveExpenseType({ category: payload.category, type: payload.type }),
    category: payload.category,
    amount: payload.amount,
    currency: payload.currency,
    expenseDate: payload.expenseDate,
    budgetAmount: payload.budgetAmount || 0,
    source: "manual",
    createdBy: actorUserId
  });

  const detailedExpense = await hydrateExpense(OwnerExpense.findById(expense._id));

  await createExpenseNotification({ ownerId, action: "created", expense: detailedExpense });
  await createBudgetNotification({ ownerId, expense: detailedExpense });

  return mapOwnerExpense(detailedExpense);
};

export const updateOwnerExpense = async ({ ownerId, actorUserId, expenseId, payload }) => {
  const existingExpense = await OwnerExpense.findOne({ _id: expenseId, ownerId });

  if (!existingExpense) {
    throw new AppError("Mouvement financier introuvable", StatusCodes.NOT_FOUND);
  }

  const property = await ensureOwnerProperty({
    ownerId,
    propertyId: payload.propertyId
  });

  existingExpense.propertyId = property?._id || null;
  existingExpense.propertyLabel = property?.title || payload.propertyLabel || "Portefeuille";
  existingExpense.label = payload.label;
  existingExpense.description = payload.description || "";
  existingExpense.type = resolveExpenseType({ category: payload.category, type: payload.type });
  existingExpense.category = payload.category;
  existingExpense.amount = payload.amount;
  existingExpense.currency = payload.currency;
  existingExpense.expenseDate = payload.expenseDate;
  existingExpense.budgetAmount = payload.budgetAmount || 0;
  existingExpense.updatedBy = actorUserId;

  await existingExpense.save();

  const detailedExpense = await hydrateExpense(OwnerExpense.findById(existingExpense._id));

  await createExpenseNotification({ ownerId, action: "updated", expense: detailedExpense });
  await createBudgetNotification({ ownerId, expense: detailedExpense });

  return mapOwnerExpense(detailedExpense);
};

export const deleteOwnerExpense = async ({ ownerId, expenseId }) => {
  const expense = await hydrateExpense(OwnerExpense.findOne({ _id: expenseId, ownerId }));

  if (!expense) {
    throw new AppError("Mouvement financier introuvable", StatusCodes.NOT_FOUND);
  }

  await OwnerExpense.deleteOne({ _id: expenseId, ownerId });
  await createExpenseNotification({ ownerId, action: "deleted", expense });

  return {
    success: true,
    expenseId
  };
};
