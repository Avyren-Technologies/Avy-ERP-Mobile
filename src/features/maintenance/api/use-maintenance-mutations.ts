import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api';
import {
    invalidateMaintenancePMScheduleQueries,
    invalidateMaintenanceWorkOrderQueries,
} from '@/features/maintenance/api/maintenance-query-sync';
import { maintenanceKeys } from '@/features/maintenance/api/use-maintenance-queries';
import type { QueryClient } from '@tanstack/react-query';

function syncWorkOrderQueries(queryClient: QueryClient, workOrderId: string) {
    queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
    invalidateMaintenanceWorkOrderQueries(queryClient);
    invalidateMaintenancePMScheduleQueries(queryClient);
}

// ── Config ──

export function useUpdateMaintenanceConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.updateConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.config() });
        },
    });
}

// ── Failure Code Sets ──

export function useCreateFailureCodeSet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createFailureCodeSet(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSets() });
        },
    });
}

export function useUpdateFailureCodeSet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateFailureCodeSet(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSet(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSets() });
        },
    });
}

export function useDeleteFailureCodeSet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteFailureCodeSet(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSets() });
        },
    });
}

// ── Failure Modes ──

export function useCreateFailureMode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ setId, data }: { setId: string; data: any }) =>
            maintenanceApi.createFailureMode(setId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureModes(variables.setId) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSet(variables.setId) });
        },
    });
}

export function useUpdateFailureMode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ setId, id, data }: { setId: string; id: string; data: any }) =>
            maintenanceApi.updateFailureMode(setId, id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureModes(variables.setId) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSet(variables.setId) });
        },
    });
}

export function useDeleteFailureMode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ setId, id }: { setId: string; id: string }) =>
            maintenanceApi.deleteFailureMode(setId, id),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureModes(variables.setId) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCodeSet(variables.setId) });
        },
    });
}

// ── Failure Causes ──

export function useCreateFailureCause() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ modeId, data }: { modeId: string; data: any }) =>
            maintenanceApi.createFailureCause(modeId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCauses(variables.modeId) });
        },
    });
}

export function useUpdateFailureCause() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ modeId, id, data }: { modeId: string; id: string; data: any }) =>
            maintenanceApi.updateFailureCause(modeId, id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCauses(variables.modeId) });
        },
    });
}

export function useDeleteFailureCause() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ modeId, id }: { modeId: string; id: string }) =>
            maintenanceApi.deleteFailureCause(modeId, id),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.failureCauses(variables.modeId) });
        },
    });
}

// ── Action Codes ──

export function useCreateActionCode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createActionCode(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.actionCodes() });
        },
    });
}

export function useUpdateActionCode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateActionCode(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.actionCodes() });
        },
    });
}

export function useDeleteActionCode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteActionCode(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.actionCodes() });
        },
    });
}

// ── Strategies ──

export function useCreateStrategy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createStrategy(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.strategies() });
        },
    });
}

export function useUpdateStrategy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateStrategy(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.strategy(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.strategies() });
        },
    });
}

export function useDeleteStrategy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteStrategy(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.strategies() });
        },
    });
}

// ── Job Plans ──

export function useCreateJobPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createJobPlan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.jobPlans() });
        },
    });
}

export function useUpdateJobPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateJobPlan(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.jobPlan(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.jobPlans() });
        },
    });
}

export function useDeleteJobPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteJobPlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.jobPlans() });
        },
    });
}

// ── Checklist Templates ──

export function useCreateChecklistTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createChecklistTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplates() });
        },
    });
}

export function useUpdateChecklistTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateChecklistTemplate(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplate(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplates() });
        },
    });
}

export function useDeleteChecklistTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteChecklistTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplates() });
        },
    });
}

// ── Assets ──

export function useCreateAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createAsset(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetHierarchy() });
        },
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateAsset(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.asset(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetHierarchy() });
        },
    });
}

export function useDeleteAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteAsset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetHierarchy() });
        },
    });
}

export function useTransferAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.transferAsset(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.asset(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetHistory(variables.id) });
        },
    });
}

export function useSyncMachines() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => maintenanceApi.syncMachines(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetHierarchy() });
        },
    });
}

// ── Asset Categories ──

export function useCreateAssetCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createAssetCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetCategories() });
        },
    });
}

export function useUpdateAssetCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateAssetCategory(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetCategories() });
        },
    });
}

export function useDeleteAssetCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteAssetCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetCategories() });
        },
    });
}

// ── Asset Sub-Categories ──

export function useCreateAssetSubCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createAssetSubCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetSubCategories() });
        },
    });
}

export function useUpdateAssetSubCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateAssetSubCategory(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetSubCategories() });
        },
    });
}

export function useDeleteAssetSubCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteAssetSubCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetSubCategories() });
        },
    });
}

// ── Asset Types ──

export function useCreateAssetType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createAssetType(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes() });
        },
    });
}

export function useUpdateAssetType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateAssetType(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes() });
        },
    });
}

export function useDeleteAssetType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteAssetType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes() });
        },
    });
}

// ── Asset Class Options ──

export function useCreateAssetClassOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createAssetClassOption(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetClassOptions() });
        },
    });
}

export function useUpdateAssetClassOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateAssetClassOption(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetClassOptions() });
        },
    });
}

export function useDeleteAssetClassOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteAssetClassOption(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetClassOptions() });
        },
    });
}

// ── Ownership Options ──

export function useCreateOwnershipOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createOwnershipOption(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ownershipOptions() });
        },
    });
}

export function useUpdateOwnershipOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateOwnershipOption(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ownershipOptions() });
        },
    });
}

export function useDeleteOwnershipOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteOwnershipOption(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ownershipOptions() });
        },
    });
}

// ── PTW Class Options ──

export function useCreatePTWClassOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createPTWClassOption(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptwClassOptions() });
        },
    });
}

export function useUpdatePTWClassOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updatePTWClassOption(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptwClassOptions() });
        },
    });
}

export function useDeletePTWClassOption() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deletePTWClassOption(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptwClassOptions() });
        },
    });
}

// ── Meters ──

export function useAddMeter() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ assetId, data }: { assetId: string; data: any }) =>
            maintenanceApi.addMeter(assetId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetMeters(variables.assetId) });
        },
    });
}

export function useUpdateMeter() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ assetId, meterId, data }: { assetId: string; meterId: string; data: any }) =>
            maintenanceApi.updateMeter(assetId, meterId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetMeters(variables.assetId) });
        },
    });
}

export function useDeleteMeter() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ assetId, meterId }: { assetId: string; meterId: string }) =>
            maintenanceApi.deleteMeter(assetId, meterId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetMeters(variables.assetId) });
        },
    });
}

export function useLogReading() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ assetId, meterId, data }: { assetId: string; meterId: string; data: any }) =>
            maintenanceApi.logReading(assetId, meterId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.meterReadings(variables.assetId, variables.meterId) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetMeters(variables.assetId) });
        },
    });
}

// ── Tags ──

export function useLinkTag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ assetId, data }: { assetId: string; data: any }) =>
            maintenanceApi.linkTag(assetId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.asset(variables.assetId) });
        },
    });
}

export function useDeactivateTag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ assetId, tagId }: { assetId: string; tagId: string }) =>
            maintenanceApi.deactivateTag(assetId, tagId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.asset(variables.assetId) });
        },
    });
}

export function useBatchGenerateTags() {
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.batchGenerateTags(data),
    });
}

// ── Work Requests ──

export function useCreateWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createWorkRequest(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

export function useUpdateWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateWorkRequest(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequest(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

export function useTriageWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.triageWorkRequest(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequest(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

export function useApproveWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.approveWorkRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

export function useRejectWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.rejectWorkRequest(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequest(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

export function useConvertWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.convertWorkRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

export function useCancelWorkRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.cancelWorkRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workRequests() });
        },
    });
}

// ── Work Orders ──

export function useCreateWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createWorkOrder(data),
        onSuccess: () => {
            invalidateMaintenanceWorkOrderQueries(queryClient);
            invalidateMaintenancePMScheduleQueries(queryClient);
        },
    });
}

export function useUpdateWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useApproveWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data?: any }) =>
            maintenanceApi.approveWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useAssignWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.assignWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useAcknowledgeWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.acknowledgeWorkOrder(id),
        onSuccess: (_, id) => {
            syncWorkOrderQueries(queryClient, id);
        },
    });
}

export function useDeclineWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.declineWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useStartWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.startWorkOrder(id),
        onSuccess: (_, id) => {
            syncWorkOrderQueries(queryClient, id);
        },
    });
}

export function useHoldWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.holdWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useResumeWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.resumeWorkOrder(id),
        onSuccess: (_, id) => {
            syncWorkOrderQueries(queryClient, id);
        },
    });
}

export function useCompleteWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.completeWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useQAReleaseWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.qaReleaseWorkOrder(id),
        onSuccess: (_, id) => {
            syncWorkOrderQueries(queryClient, id);
        },
    });
}

export function useCloseWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.closeWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useRejectWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.rejectWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useCancelWO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.cancelWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useReopenWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.reopenWorkOrder(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useSubmitChecklist() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.submitChecklist(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useAddWOParts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.addWOParts(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useReturnWOPart() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, partId, data }: { id: string; partId: string; data: any }) =>
            maintenanceApi.returnWOPart(id, partId, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useLogWOLabour() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.logWOLabour(id, data),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

export function useAddWOEvidence() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, evidence }: { id: string; evidence: unknown[] }) =>
            maintenanceApi.addWOEvidence(id, evidence),
        onSuccess: (_, variables) => {
            syncWorkOrderQueries(queryClient, variables.id);
        },
    });
}

// ── Breakdowns ──

export function useLogBreakdown() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.logBreakdown(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.breakdowns() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.downtimeList() });
        },
    });
}

export function useAssignBreakdown() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.assignBreakdown(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.breakdown(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.breakdowns() });
        },
    });
}

export function useResolveBreakdown() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.resolveBreakdown(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.breakdown(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.breakdowns() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.downtimeList() });
        },
    });
}

// ── Downtime ──

export function useCreateDowntime() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createDowntime(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.downtimeList() });
        },
    });
}

export function useUpdateDowntime() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateDowntime(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.downtimeList() });
        },
    });
}

// ── Contracts ──

export function useCreateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createContract(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contracts() });
        },
    });
}

export function useUpdateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updateContract(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contract(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contracts() });
        },
    });
}

export function useDeleteContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contracts() });
        },
    });
}

export function useAddContractAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.addContractAsset(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contract(variables.id) });
        },
    });
}

export function useRemoveContractAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, assetId }: { id: string; assetId: string }) =>
            maintenanceApi.removeContractAsset(id, assetId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contract(variables.id) });
        },
    });
}

export function useLogContractVisit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.logContractVisit(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contract(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.contractUtilisation(variables.id) });
        },
    });
}

// ── Spare Parts ──

export function useReserveParts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ woId, data }: { woId: string; data: any }) =>
            maintenanceApi.reserveParts(woId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.stockoutAlerts() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(variables.woId) });
        },
    });
}

export function useIssueParts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ woId, data }: { woId: string; data: any }) =>
            maintenanceApi.issueParts(woId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.stockoutAlerts() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(variables.woId) });
        },
    });
}

// ── PM Schedules ──

export function useCreatePMSchedule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createPMSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedules() });
            queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'pm-calendar'] });
        },
    });
}

export function useUpdatePMSchedule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.updatePMSchedule(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedule(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedules() });
            queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'pm-calendar'] });
        },
    });
}

export function useDeletePMSchedule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deletePMSchedule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedules() });
            queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'pm-calendar'] });
        },
    });
}

export function useReschedulePM() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.reschedulePM(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedule(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedules() });
            queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'pm-calendar'] });
        },
    });
}

export function useSkipPM() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            maintenanceApi.skipPM(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedule(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedules() });
            queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'pm-calendar'] });
        },
    });
}

export function useGenerateWOFromPM() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.generateWOFromPM(id),
        onSuccess: (_, pmScheduleId) => {
            invalidateMaintenancePMScheduleQueries(queryClient, pmScheduleId);
            invalidateMaintenanceWorkOrderQueries(queryClient);
        },
    });
}

// ── PTW ──

function usePTWAction(actionFn: (args: { id: string; data?: any }) => Promise<any>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: actionFn,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptw(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptwList() });
        },
    });
}

export function useCreatePTW() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createPTW(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptwList() });
        },
    });
}

export function useUpdatePTW() {
    return usePTWAction(({ id, data }) => maintenanceApi.updatePTW(id, data));
}

export function useReviewPTW() {
    return usePTWAction(({ id }) => maintenanceApi.reviewPTW(id));
}

export function useIssuePTW() {
    return usePTWAction(({ id }) => maintenanceApi.issuePTW(id));
}

export function useClosePTW() {
    return usePTWAction(({ id }) => maintenanceApi.closePTW(id));
}

export function useRevokePTW() {
    return usePTWAction(({ id, data }) => maintenanceApi.revokePTW(id, data));
}

export function useDeletePTW() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deletePTW(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.ptwList() });
        },
    });
}

// ── Shutdowns ──

function useShutdownAction(actionFn: (args: { id: string; data?: any }) => Promise<any>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: actionFn,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdown(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdowns() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdownProgress(variables.id) });
        },
    });
}

export function useCreateShutdown() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => maintenanceApi.createShutdown(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdowns() });
        },
    });
}

export function useUpdateShutdown() {
    return useShutdownAction(({ id, data }) => maintenanceApi.updateShutdown(id, data));
}

export function useDeleteShutdown() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => maintenanceApi.deleteShutdown(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdowns() });
        },
    });
}

export function useApproveShutdown() {
    return useShutdownAction(({ id }) => maintenanceApi.approveShutdown(id));
}

export function useAddShutdownWOs() {
    return useShutdownAction(({ id, data }) => maintenanceApi.addShutdownWOs(id, data));
}

export function useRemoveShutdownWO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, woId }: { id: string; woId: string }) =>
            maintenanceApi.removeShutdownWO(id, woId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdown(variables.id) });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdowns() });
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.shutdownProgress(variables.id) });
        },
    });
}

export function useStartShutdown() {
    return useShutdownAction(({ id }) => maintenanceApi.startShutdown(id));
}

export function useCompleteShutdown() {
    return useShutdownAction(({ id }) => maintenanceApi.completeShutdown(id));
}
