package core

import (
	"context"
	"sync"
)

// DefaultCreateConcurrency 是批量纳入的默认并发度。
//
// 每条 URL 纳入的主要耗时在元数据抓取的网络往返（单条预算 10s），DB 写入由
// storage.WithTx 的互斥锁串行化，因此并发主要并行化网络段而不是写段。取 8 是
// 「明显快于串行、又不至于让目标站点/本地连接池承压」的折中，实测方法见 PR 说明。
const DefaultCreateConcurrency = 8

// CreateResourceBatchResult 是批量纳入中单项的结算：成功回读视图，失败带回原因。
type CreateResourceBatchResult struct {
	Index int
	View  *ResourceView
	Err   error
}

// CreateResourceBatch 并发纳入一批 Resource；单条失败不影响其余项。
//
// onResult 在每项结算时立即回调（顺序为完成顺序，不是输入顺序），供上层推送进度。
// ctx 取消后不再启动新项：已开始的项按各自结果结算，未开始的项以 ctx 错误返回，
// 调用方据此区分「已取消」与「失败」。
func (s *Library) CreateResourceBatch(
	ctx context.Context,
	inputs []CreateResourceInput,
	concurrency int,
	onResult func(CreateResourceBatchResult),
) []CreateResourceBatchResult {
	results := make([]CreateResourceBatchResult, len(inputs))
	if len(inputs) == 0 {
		return results
	}
	if concurrency <= 0 {
		concurrency = DefaultCreateConcurrency
	}
	workers := min(concurrency, len(inputs))
	jobs := make(chan int)
	var wg sync.WaitGroup
	wg.Add(workers)
	for range workers {
		go func() {
			defer wg.Done()
			for index := range jobs {
				if err := ctx.Err(); err != nil {
					results[index] = CreateResourceBatchResult{Index: index, Err: err}
					if onResult != nil {
						onResult(results[index])
					}
					continue
				}
				view, err := s.CreateResource(ctx, inputs[index])
				results[index] = CreateResourceBatchResult{Index: index, View: view, Err: err}
				if onResult != nil {
					onResult(results[index])
				}
			}
		}()
	}
	for index := range inputs {
		jobs <- index
	}
	close(jobs)
	wg.Wait()
	return results
}
