package backend

// Remote 预留：调用远程服务端接口的客户端。
// 后续接入云同步、远程搜索等功能时在此实现。
type Remote struct{}

func NewRemote() *Remote {
	return &Remote{}
}
