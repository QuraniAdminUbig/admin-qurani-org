export const checkRole = (
  userId: string | number,
  group: {
    owner_id: string | number;
    grup_members: { role: "admin" | "member" | "owner"; user_id: string }[];
  } | null
): "owner" | "admin" | "member" | "none" => {
  if (!group) return "none";

  if (userId === group.owner_id) {
    return "owner";
  }

  const member = group.grup_members.find((m) => m.user_id === userId);
  if (member) {
    return member.role;
  }

  return "member";
};
