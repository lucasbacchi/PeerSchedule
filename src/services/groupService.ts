import type { Group } from "@/types/database";
import {
    addCalendarMember,
    createCalendar,
    deleteCalendar,
    getAllCalendars,
    getCalendarById,
    getUserCalendars,
    removeCalendarMember,
    updateCalendar,
} from "./calendarService";

/**
 * Compatibility layer for the original project service name. New code should
 * prefer calendarService.ts because Group represents a shared calendar.
 */
export const getAllGroups = getAllCalendars;
export const getGroupById = getCalendarById;

export const getGroupsByOwnerId = async (ownerId: string): Promise<Group[]> => {
    const groups = await getUserCalendars(ownerId);
    return groups.filter((group) => group.ownerId === ownerId);
};

export const getGroupsByMemberId = getUserCalendars;

export const getGroupsByIds = async (groupIds: string[]): Promise<Group[]> => {
    const groups = await Promise.all([...new Set(groupIds)].map((groupId) => getCalendarById(groupId)));
    return groups.filter((group): group is Group => group !== null);
};

export const createGroup = async (group: Omit<Group, "id">): Promise<string> => {
    const createdGroup = await createCalendar({
        name: group.name,
        description: group.description,
        color: group.color,
        ownerId: group.ownerId,
    });

    const additionalMemberIds = group.memberIds.filter((memberId) => memberId !== group.ownerId);
    await Promise.all(additionalMemberIds.map((memberId) => addCalendarMember(createdGroup.id, memberId)));
    return createdGroup.id;
};

export const updateGroup = async (groupId: string, updatedData: Partial<Group>): Promise<void> => {
    const existingGroup = await getCalendarById(groupId);
    if (!existingGroup) {
        throw new Error("Calendar not found.");
    }

    await updateCalendar(groupId, {
        name: updatedData.name,
        description: updatedData.description,
        color: updatedData.color,
    });

    if (updatedData.memberIds) {
        const requestedMembers = new Set(updatedData.memberIds);
        requestedMembers.add(existingGroup.ownerId);

        const membersToAdd = [...requestedMembers].filter((memberId) => !existingGroup.memberIds.includes(memberId));
        const membersToRemove = existingGroup.memberIds.filter(
            (memberId) => memberId !== existingGroup.ownerId && !requestedMembers.has(memberId)
        );

        await Promise.all([
            ...membersToAdd.map((memberId) => addCalendarMember(groupId, memberId)),
            ...membersToRemove.map((memberId) => removeCalendarMember(groupId, memberId)),
        ]);
    }
};

export const deleteGroup = deleteCalendar;
