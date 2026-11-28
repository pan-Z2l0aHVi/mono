package service

import (
	"context"
	"errors"
	"sync/atomic"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// ResourceBatchProgressEventName 推送批量纳入的逐项进度。
const ResourceBatchProgressEventName = "library:resource-batch-progress"

// ResourceBatchStatus 是单项结算的闭集；前端据此把队列行标成成功/失败/取消。
type ResourceBatchStatus string

const (
	ResourceBatchStatusCreated   ResourceBatchStatus = "created"
	ResourceBatchStatusFailed    ResourceBatchStatus = "failed"
	ResourceBatchStatusCancelled ResourceBatchStatus = "cancelled"
)

// CreateResourceBatchResultDTO 是批量纳入的单项最终结果，按输入下标对齐。
// 失败不返回 RPC 错误：一批里混有坏链接是常态，调用方要的是逐项明细。
type CreateResourceBatchResultDTO struct {
	Index     int          `json:"index"`
	Resource  *ResourceDTO `json:"resource,omitempty"`
	Error     string       `json:"error,omitempty"`
	Cancelled bool         `json:"cancelled,omitempty"`
}

// ResourceBatchProgressDTO 是逐项进度推送载荷；Done/Total 让前端不必自行累计。
type ResourceBatchProgressDTO struct {
	BatchID  string              `json:"batch_id"`
	Index    int                 `json:"index"`
	Status   ResourceBatchStatus `json:"status"`
	Done     int                 `json:"done"`
	Total    int                 `json:"total"`
	Resource *ResourceDTO        `json:"resource,omitempty"`
	Error    string              `json:"error,omitempty"`
}

// CreateResources 批量纳入 Resource：并发探测与写入由 core 承载，单条失败不阻断其余项。
// 进度经 ResourceBatchProgressEventName 推送；ctx 取消后不再启动新项。
func (s *ResourceService) CreateResources(
	ctx context.Context,
	batchID string,
	inputs []CreateResourceInputDTO,
) ([]CreateResourceBatchResultDTO, error) {
	if batchID == "" {
		return nil, errors.New("batch id is required")
	}
	batchCtx, cancel := context.WithCancel(ctx)
	s.batchesMu.Lock()
	s.batches[batchID] = cancel
	s.batchesMu.Unlock()
	defer func() {
		s.batchesMu.Lock()
		if current, ok := s.batches[batchID]; ok && current != nil {
			delete(s.batches, batchID)
		}
		s.batchesMu.Unlock()
		cancel()
	}()

	coreInputs := make([]core.CreateResourceInput, len(inputs))
	for index, input := range inputs {
		coreInputs[index] = core.CreateResourceInput{
			Kind:         input.Kind,
			Location:     input.Location,
			InitialTitle: input.Title,
			Tags:         input.Tags,
		}
	}

	total := len(inputs)
	var done atomic.Int64
	results := s.core.CreateResourceBatch(batchCtx, coreInputs, s.batchConcurrency, func(result core.CreateResourceBatchResult) {
		progress := s.progressDTO(batchID, result, total)
		progress.Done = int(done.Add(1))
		s.emitEvent(ResourceBatchProgressEventName, progress)
	})

	out := make([]CreateResourceBatchResultDTO, len(results))
	for index, result := range results {
		out[index] = s.batchResultDTO(result)
	}
	return out, nil
}

// CancelResourceBatch 请求停止后续项；已在途的项按各自结果结算，不会被强杀。
func (s *ResourceService) CancelResourceBatch(batchID string) error {
	s.batchesMu.Lock()
	cancel := s.batches[batchID]
	s.batchesMu.Unlock()
	if cancel != nil {
		cancel()
	}
	return nil
}

func (s *ResourceService) batchResultDTO(result core.CreateResourceBatchResult) CreateResourceBatchResultDTO {
	dto := CreateResourceBatchResultDTO{Index: result.Index}
	switch {
	case result.Err == nil && result.View != nil:
		dto.Resource = resourceViewToDTOWithURLs(result.View, s.urls)
	case errors.Is(result.Err, context.Canceled):
		dto.Cancelled = true
	case result.Err != nil:
		dto.Error = result.Err.Error()
	}
	return dto
}

func (s *ResourceService) progressDTO(
	batchID string,
	result core.CreateResourceBatchResult,
	total int,
) ResourceBatchProgressDTO {
	dto := ResourceBatchProgressDTO{BatchID: batchID, Index: result.Index, Total: total}
	switch {
	case result.Err == nil && result.View != nil:
		dto.Status = ResourceBatchStatusCreated
		dto.Resource = resourceViewToDTOWithURLs(result.View, s.urls)
	case errors.Is(result.Err, context.Canceled):
		dto.Status = ResourceBatchStatusCancelled
	case result.Err != nil:
		dto.Status = ResourceBatchStatusFailed
		dto.Error = result.Err.Error()
	default:
		// 理论上不可达：core 的单项结果要么带视图要么带错误。保留显式状态而不是空串。
		dto.Status = ResourceBatchStatusFailed
		dto.Error = "resource creation returned no result"
	}
	return dto
}
